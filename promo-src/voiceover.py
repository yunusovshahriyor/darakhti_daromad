#!/usr/bin/env python3
"""Овоз бо ElevenLabs месозад ва бо мусиқӣ ба видео ҳамроҳ мекунад.
Истифода: python3 voiceover.py <voice_id> <ном> <видеои_вурудӣ.mp4> <music.wav> <папкаи_коркард> <хуруҷӣ.mp4>
Калид: бо муҳит (секрети шабакавӣ) ба дархостҳои api.elevenlabs.io худкор илова мешавад."""
import json, subprocess, sys, os

voice_id, name, video, music, work, outp = sys.argv[1:7]
os.makedirs(work, exist_ok=True)
LINES = [  # (оғози саҳна, с; вақти дастрас, с; матн)
    (0.0, 2.1, "Куда уходят ваши деньги?"),
    (2.4, 3.4, "Записали доход. Остальное сделает приложение."),
    (6.0, 3.4, "Оно само делит сумму по счетам."),
    (9.6, 3.4, "Долги под контролем: видно, сколько осталось."),
    (13.2, 3.4, "Мечты с планом. Даже игра на пятьдесят две недели."),
    (16.8, 3.4, "Бот в Телеграме напомнит о платежах вовремя."),
    (20.4, 4.2, "Дерево дохода. Просто и устойчиво. Открывайте в Телеграме."),
]

def run(cmd): subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def dur(p): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',p]).strip())

clips = []
for i, (t0, avail, text) in enumerate(LINES):
    raw = f"{work}/{name}_{i}.mp3"
    body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True}})
    r = subprocess.run(["curl","-sS","-m","90","-X","POST",
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        "-H","Content-Type: application/json","-d",body,"-o",raw,"-w","%{http_code}"], capture_output=True, text=True)
    if r.stdout.strip() != "200":
        print("TTS error", i, r.stdout, open(raw,'rb').read(300)); sys.exit(1)
    d = dur(raw); fit = raw
    if d > avail:
        tempo = min(d/avail, 1.3)
        fit = f"{work}/{name}_{i}_fit.wav"
        run(["ffmpeg","-y","-i",raw,"-filter:a",f"atempo={tempo:.3f}",fit])
    print(f"line {i}: {d:.2f}s (avail {avail}s) -> {dur(fit):.2f}s")
    clips.append((t0+0.12, fit))

inputs = ["-i", video, "-i", music] + sum([["-i", c] for _, c in clips], [])
fc = "[1:a]volume=0.85[music];"
for k, (t0, _) in enumerate(clips):
    ms = int(t0*1000)
    fc += f"[{k+2}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={ms}|{ms}[v{k}];"
fc += "".join(f"[v{k}]" for k in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0[voice];"
fc += "[voice]asplit=2[vo1][vo2];[music][vo1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[duck];"
fc += "[duck][vo2]amix=inputs=2:normalize=0:weights='0.75 1.5'[mix];[mix]alimiter=limit=0.95[a]"
run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","0:v","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k","-t","25.2","-movflags","+faststart",outp])
print("done", outp)
