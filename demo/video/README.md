# tourty promo video

`tourty-promo.mp4`: 32 seconds, 1080×1920 (vertical), 30 fps, no soundtrack.

The video is an HTML animation (`promo.html`) rendered frame by frame:

```bash
cd demo/video
mkdir -p frames && node render.js            # needs Playwright with Chromium
ffmpeg -framerate 30 -i frames/f%04d.jpg -c:v libx264 -crf 19 -pix_fmt yuv420p -movflags +faststart tourty-promo.mp4
```

Photos in `hi/` are from Wikimedia Commons and must stay credited (the end card does this):
Sigiriya by Gayomiw, Nine Arches Bridge by Knthabrew, Mirissa by Abishek Palraj,
Yala leopard by Casey Klebba (all CC BY-SA 4.0); Kandy tuk-tuks by McKay Savage (CC BY 2.0).
Map outline: Natural Earth (public domain).
