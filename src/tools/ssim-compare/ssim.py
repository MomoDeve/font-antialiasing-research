# credits to @pranjaldatta: https://github.com/pranjaldatta/SSIM-PyTorch

import torch  
import torch.nn.functional as F 
import numpy as np
import math
import sys
from PIL import Image

def gaussian(window_size, sigma):
    gauss =  torch.Tensor([math.exp(-(x - window_size//2)**2/float(2*sigma**2)) for x in range(window_size)])
    return gauss/gauss.sum() 

def create_window(window_size, channel=1):
    _1d_window = gaussian(window_size=window_size, sigma=1.5).unsqueeze(1)
    _2d_window = _1d_window.mm(_1d_window.t()).float().unsqueeze(0).unsqueeze(0)
    window = torch.Tensor(_2d_window.expand(channel, 1, window_size, window_size).contiguous())
    return window

def ssim(img1, img2, val_range, window_size=11, window=None, size_average=True, full=False):
    L = val_range
    pad = window_size // 2
    
    try:
        _, channels, height, width = img1.size()
    except:
        channels, height, width = img1.size()

    if window is None: 
        real_size = min(window_size, height, width)
        window = create_window(real_size, channel=channels).to(img1.device)
    
    mu1 = F.conv2d(img1, window, padding=pad, groups=channels)
    mu2 = F.conv2d(img2, window, padding=pad, groups=channels)
    
    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2 
    mu12 = mu1 * mu2

    sigma1_sq = F.conv2d(img1 * img1, window, padding=pad, groups=channels) - mu1_sq
    sigma2_sq = F.conv2d(img2 * img2, window, padding=pad, groups=channels) - mu2_sq
    sigma12 =  F.conv2d(img1 * img2, window, padding=pad, groups=channels) - mu12

    C1 = (0.01 * L) ** 2
    C2 = (0.03 * L) ** 2 

    contrast_metric = (2.0 * sigma12 + C2) / (sigma1_sq + sigma2_sq + C2)
    contrast_metric = torch.mean(contrast_metric)

    numerator1 = 2 * mu12 + C1  
    numerator2 = 2 * sigma12 + C2
    denominator1 = mu1_sq + mu2_sq + C1 
    denominator2 = sigma1_sq + sigma2_sq + C2

    ssim_score = (numerator1 * numerator2) / (denominator1 * denominator2)

    if size_average:
        ret = ssim_score.mean() 
    else: 
        ret = ssim_score.mean(1).mean(1).mean(1)
    
    if full:
        return ret, contrast_metric
    
    return ret

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("run file as 'ssim.py {image1_path} {image2_path}'")
        exit()

    load_images = lambda x: np.array(Image.open(x).convert('RGB'))
    img1 = load_images(sys.argv[1])
    img2 = load_images(sys.argv[2])

    tensorify = lambda x: torch.Tensor(x.transpose((2, 0, 1))).unsqueeze(0).float().div(255.0)
    _img1 = tensorify(img1)
    _img2 = tensorify(img2)
    metric = ssim(_img1, _img2, val_range=255)
    print("Image SSIM Score: ", metric)
