import numpy as np
import numpy.typing as npt
import sys
from PIL import Image
from typing import Any, List

def save_sdf(sdf: npt.NDArray[Any], filename: str, sdf_channels: int, sdf_width: int, sdf_height: int, max_error=0):
    compressed_data = bytearray()
    for channel in range(sdf_channels):
        channel_data = sdf[:,:,channel].flatten()
        min_dist = int(np.min(channel_data))
        max_dist = int(np.max(channel_data))
        channel_compressed_data = vdt_compress(channel_data, sdf_width, sdf_height, min_dist, max_dist, max_error)
        compressed_data.extend(channel_compressed_data)

    with open(filename, "wb") as f:
        f.write(compressed_data)

def _predict(width, max_error):
    def predict(sdf, i):
        d02 = sdf[i] ** 2
        if i >= width + 1:
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

def mapi(lst, func):
    return [func(lst, i) for i in range(len(lst))]

def filter_dists(sdf, vecs):
    return [sdf[i] for i in range(len(vecs)) if vecs[i] == 0]

def _calc_vdt(sdf, width, max_error):
    vecs = mapi(sdf, _predict(width, max_error))
    dists = filter_dists(sdf, vecs)
    return vecs, dists

def lst_to_bin(lst: List[int], bits: int) -> bytes:
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
    vecs, dists = _calc_vdt(sdf_data, width, max_error)
    dist_bits = 16 if max_dist - min_dist > 255 else 8

    result.extend(lst_to_bin([min_dist], 16))
    result.extend(lst_to_bin([dist_bits], 8))
    result.extend(lst_to_bin([width], 16))
    result.extend(lst_to_bin([height], 16))
    result.extend(lst_to_bin(vecs, 2))
    result.extend(lst_to_bin(dists, 8))
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("run file as 'ssim.py {sdf_image_path}'")
        exit()
    
    load_images = lambda x: np.asarray(Image.open(x))
    img_path = sys.argv[1]
    img = load_images(img_path)

    height, width, channels = img.shape
    save_sdf(img, f'{img_path}.comp', channels, width, height)