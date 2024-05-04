import sys
import numpy as np
from PIL import Image
import lzma

def decompress_sdf(data: bytearray):
    uncompressed_data = lzma.decompress(data)

    channel_count = uncompressed_data[0]
    channels = []
    offset = 1
    for _ in range(channel_count):
        channel, new_offset = vdt_decompress(uncompressed_data, offset)
        channels.append(channel)
        offset = new_offset

    channel_map = ['', 'R', 'RG', 'RGB', 'RGBA']
    return Image.merge(channel_map[channel_count], tuple(map(Image.fromarray, channels)))

def expand_sdf(min_dist, width, vecs, dists):
    sdf = []
    d_index = 0
    for i, v in enumerate(vecs):
        if v == 0:
            sdf.append(int(dists[d_index]))
            d_index += 1
        elif v == 1:
            d1 = sdf[i - 1]
            d2 = sdf[i - 2]
            sdf.append(int((2 * d1 ** 2 - d2 ** 2 + 2) ** 0.5))
        elif v == 2:
            d1 = sdf[i - width]
            d2 = sdf[i - 2 * width]
            sdf.append(int((2 * d1 ** 2 - d2 ** 2 + 2) ** 0.5))
        elif v == 3:
            d1 = sdf[i - (width + 1)]
            d2 = sdf[i - 2 * (width + 1)]
            sdf.append(int((2 * d1 ** 2 - d2 ** 2) ** 0.5))

    for i in range(len(sdf)):
        sdf[i] += min_dist
    return sdf

def decode_int(s):
    return (s[0] << 8) | s[1]

def decode_bits(s, bits):
    result = []
    total_bits = 0
    value = 0
    
    for byte in s:
        for i in range(8, 0, -bits):
            mask = (1 << bits) - 1
            shift = i - bits
            fragment = (byte >> shift) & mask
            value = (value << bits) | fragment
            total_bits += bits
            if total_bits >= bits:
                result.append(int(value))
                value = 0
                total_bits = 0

    if total_bits > 0:
        result.append(int(value << (bits - total_bits)))
    
    return result

def vdt_decompress(data, offset):
    min_dist = decode_int(data[offset:offset + 2])
    offset += 2

    dist_bits = data[offset]
    offset += 1

    width = decode_int(data[offset:offset + 2])
    offset += 2

    height = decode_int(data[offset:offset + 2])
    offset += 2

    vec_length = (width * height) // 4
    vecs = decode_bits(data[offset:offset + vec_length], 2)
    offset += vec_length

    dist_length = vecs.count(0)

    dists = decode_bits(data[offset:offset + dist_length], dist_bits)
    offset += dist_length

    data = expand_sdf(min_dist, width, vecs, dists)
    channel = np.array(data, dtype=np.uint8).reshape((height, width))

    return channel, offset

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("run file as 'decompress.py {compressed_sdf_path}'")
        exit()

    path = sys.argv[1]
    with open(path, "rb") as f:
        compressed_data = f.read()

    image = decompress_sdf(compressed_data)
    image.save(f'{path}.png')