from __future__ import annotations
import hashlib, io, json, math, struct, wave, zipfile
from pathlib import Path

RATE = 22050
DURATION = 1.5
ROOTS = [48, 55, 60, 64, 67, 72, 76, 79]
OUT = Path(__file__).parent

PACKS = {
    "slumber_egyptian_studio": {
        "collectionId": "egyptian",
        "displayName": "Egyptian Studio — Slumber Synth",
        "instruments": ["Ney — Slumber Synth", "Oud — Slumber Synth", "Qanun — Slumber Synth", "Mizmar — Slumber Synth"],
        "folders": ["ney", "oud", "qanun", "mizmar"],
        "tuning": ["MAQAM_HIJAZ_APPROX", "MAQAM_RAST_APPROX"],
    },
    "slumber_arabic_studio": {
        "collectionId": "arabic",
        "displayName": "Arabic Studio — Slumber Synth",
        "instruments": ["Oud — Slumber Synth", "Ney — Slumber Synth", "Rabab — Slumber Synth", "Santour-like — Slumber Synth"],
        "folders": ["oud", "ney", "rabab", "santour"],
        "tuning": ["MAQAM_RAST_APPROX", "CUSTOM_CENTS"],
    },
}

def midi_hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def synth(folder: str, midi: int) -> bytes:
    f = midi_hz(midi)
    frames = []
    for i in range(int(RATE * DURATION)):
        t = i / RATE
        attack = min(1.0, t / 0.025)
        release = min(1.0, max(0.0, (DURATION - t) / 0.35))
        env = attack * release * math.exp(-t * (1.35 if folder in {"oud", "qanun", "santour"} else 0.55))
        if folder == "ney":
            v = math.sin(2*math.pi*f*t) + .18*math.sin(2*math.pi*2*f*t) + .06*math.sin(2*math.pi*3*f*t)
            v += .018*math.sin(2*math.pi*7.3*t)
        elif folder == "mizmar":
            v = .85*math.sin(2*math.pi*f*t) + .42*math.sin(2*math.pi*2*f*t) + .22*math.sin(2*math.pi*3*f*t)
        elif folder == "rabab":
            v = .85*math.sin(2*math.pi*f*t) + .27*math.sin(2*math.pi*2*f*t) + .15*math.sin(2*math.pi*3*f*t)
        else:
            pluck = math.exp(-t*3.2)
            v = pluck*(math.sin(2*math.pi*f*t) + .45*math.sin(2*math.pi*2*f*t) + .2*math.sin(2*math.pi*3*f*t))
        sample = max(-1.0, min(1.0, v * env * .55))
        frames.append(struct.pack('<h', int(sample * 32767)))
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(b''.join(frames))
    return buf.getvalue()

def payload_digest(files: dict[str, bytes]) -> str:
    h = hashlib.sha256()
    for name in sorted(files):
        h.update(name.encode()); h.update(b'\0'); h.update(files[name])
    return h.hexdigest()

def build(pack_id: str, cfg: dict):
    files = {}
    zones = []
    for inst, folder in zip(cfg['instruments'], cfg['folders']):
        for idx, root in enumerate(ROOTS):
            lo = 0 if idx == 0 else (ROOTS[idx-1] + root)//2 + 1
            hi = 127 if idx == len(ROOTS)-1 else (root + ROOTS[idx+1])//2
            rel = f"{folder}/{root}.wav"
            files[rel] = synth(folder, root)
            zones.append({"file":rel,"instrument":inst,"rootMidi":root,"lowMidi":lo,"highMidi":hi,"velocityLow":1,"velocityHigh":127,"roundRobin":1,"articulation":"sustain","trigger":"ATTACK","gainDb":0.0,"tuneCents":0.0})
    manifest = {
        "schemaVersion":2,"packId":pack_id,"collectionId":cfg['collectionId'],"displayName":cfg['displayName'],"version":"1.0.0",
        "instruments":cfg['instruments'],"licenseId":"CC0-1.0","attribution":"Original synthesized Slumber instrument pack created for the Slumber app; no third-party recordings used.",
        "sourceUrl":"https://github.com/Tomex777/automation-hub/tree/main/slumber-packs","sampleFormat":"wav","sampleRateHz":RATE,"channelCount":1,
        "velocityLayers":1,"roundRobins":1,"articulations":["sustain"],"tuningProfileIds":cfg['tuning'],"hasReleaseSamples":False,"hasSustainSamples":True,
        "contentSha256":payload_digest(files),"zones":zones,
    }
    target = OUT / f"{pack_id}.zip"
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False))
        for name, data in files.items(): z.writestr(name, data)
    print(target, target.stat().st_size, hashlib.sha256(target.read_bytes()).hexdigest())

if __name__ == '__main__':
    # Generated files are committed by GitHub Actions and served through raw.githubusercontent.com.
    for pid, cfg in PACKS.items(): build(pid, cfg)
