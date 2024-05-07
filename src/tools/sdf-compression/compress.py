import numpy as np
import numpy.typing as npt
import sys
import os
from PIL import Image
import lzma

from typing import Any, List

def compress_sdf(sdf: npt.NDArray[Any], sdf_channels, sdf_width, sdf_height, max_error=0):
    compressed_data = bytearray()
    compressed_data.append(sdf_channels)

    for channel in range(sdf_channels):
        channel_data = sdf[:,:,channel].flatten()
        min_dist = int(np.min(channel_data))
        max_dist = int(np.max(channel_data))
        channel_compressed_data = vdt_compress(channel_data, sdf_width, sdf_height, min_dist, max_dist, max_error)
        compressed_data.extend(channel_compressed_data)

    # compress vdt encoded data
    compressed_data = lzma.compress(compressed_data)
    return compressed_data

def predict_func(width, max_error):
    def predict(sdf, i):
        d02 = sdf[i] ** 2
        if i >= 2 * width + 1:
            dd1, dd2 = sdf[i - (width + 1)], sdf[i - 2 * (width + 1)]
            if abs(d02 - (2 * dd1 ** 2 - dd2 ** 2)) <= max_error:
                return 3
        if i >= 2 * width:
            du1, du2 = sdf[i - width], sdf[i - 2 * width]
            if abs(d02 - (2 * du1 ** 2 - du2 ** 2 + 2)) <= max_error:
                return 2
        if i >= 2:
            dl1, dl2 = sdf[i - 1], sdf[i - 2]
            if abs(d02 - (2 * dl1 ** 2 - dl2 ** 2 + 2)) <= max_error:
                return 1
        return 0
    return predict

def map_sdf(lst, func):
    return [func(lst, i) for i in range(len(lst))]

def filter_dists(sdf, vecs):
    return [sdf[i] for i in range(len(vecs)) if vecs[i] == 0]

def vdt_calc(sdf, width, max_error):
    vecs = map_sdf(sdf, predict_func(width, max_error))
    dists = filter_dists(sdf, vecs)
    return vecs, dists

def encode_bits(lst: List[int], bits: int) -> bytes:
    accumulator = 0
    bit_count = 0
    result = bytearray()

    for number in lst:
        accumulator = (accumulator << bits) | number
        bit_count += bits
        
        while bit_count >= 8:
            bit_count -= 8
            result.append((accumulator >> bit_count) & 0xFF)
    
    if bit_count > 0:
        result.append((accumulator << (8 - bit_count)) & 0xFF)

    return result

def vdt_compress(sdf_data, width, height, min_dist, max_dist, max_error=0):
    result = bytearray()
    vecs, dists = vdt_calc(sdf_data, width, max_error)
    dist_bits = 16 if max_dist - min_dist > 255 else 8

    result.extend(encode_bits([min_dist], 16))
    result.extend(encode_bits([dist_bits], 8))
    result.extend(encode_bits([width], 16))
    result.extend(encode_bits([height], 16))
    result.extend(encode_bits(vecs, 2))
    result.extend(encode_bits(dists, 8))
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("run file as 'compress.py {sdf_image_path}'")
        exit()

    image_path = sys.argv[1]
    original_size = os.path.getsize(image_path)
    print(f'original size: {original_size} bytes')

    img_data = np.asarray(Image.open(image_path))
    height, width, channels = img_data.shape
    print(f'raw binary size: {img_data.nbytes} bytes')

    compressed_data = compress_sdf(img_data, channels, width, height)

    compressed_size = len(compressed_data)
    print(f'compressed size: {compressed_size} bytes ({round(compressed_size / original_size * 100, 2)}% of original)')

    output = f'{image_path}.comp'
    with open(output, "wb") as f:
        f.write(compressed_data)
        print(f'written compressed data to {output}')