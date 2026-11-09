# tourty videos

## Pitch video (with sound)

`tourty-pitch.mp4`: 50 seconds, 1080×1920, 30 fps, AAC stereo at -14 LUFS.
Problem → reveal → five features → why now → close. Music and sound effects are original,
synthesized in `pitch_audio.py` (no samples, no licensed music), placed on the same cue
sheet (`cues.json`, written by the script) that drives the animation in `pitch.template.html`.

```bash
cd demo/video
python3 pitch_audio.py .                         # writes cues.json and pitch-audio.wav (needs numpy)
python3 -c "s=open('pitch.template.html').read().replace('{{LAND}}',open('lka-path.txt').read().strip()).replace('{{CUES}}',open('cues.json').read());open('pitch.html','w').write(s)"
mkdir -p pframes && node render-pitch.js         # needs Playwright with Chromium
ffmpeg -framerate 30 -i pframes/f%04d.jpg -i pitch-audio.wav -c:v libx264 -crf 19 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -shortest -movflags +faststart tourty-pitch.mp4
```

## Short promo (silent)

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
