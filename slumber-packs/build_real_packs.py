from __future__ import annotations
import hashlib, json, re, shutil, subprocess, tarfile, tempfile, urllib.request, wave, zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parent / 'published'
OUT.mkdir(parents=True, exist_ok=True)

SOURCES = [
    dict(pack_id='freepats_upright_kw', title='Upright Piano KW · FreePats', instrument='Upright Piano KW', catalog_id='piano.upright', version='2022-02-21', url='https://freepats.zenvoid.org/Piano/UprightPianoKW/UprightPianoKW-small-SFZ-20190703.7z', kind='7z', source_url='https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html', attribution='Kawai upright piano recorded by Gonzalo and Roberto for FreePats; CC0 1.0.'),
    dict(pack_id='freepats_old_piano_fb', title='Old Piano FB · FreePats', instrument='Old Piano FB', catalog_id='piano.tack', version='2020-04-01', url='https://github.com/freepats/old-piano-FB/releases/download/2020-04-01/PianoFB-small-SFZ%2BWAV-20200401.7z', kind='7z', source_url='https://freepats.zenvoid.org/Piano/honky-tonk-piano.html', attribution='Francis Bacon player piano recorded by Piotr Barcz and published by FreePats; CC0 1.0.'),
    dict(pack_id='freepats_fm_piano2', title='FM Piano 2 · FreePats', instrument='FM Piano 2', catalog_id='ep.fm', version='2016-11-12', url='https://github.com/freepats/fm-piano2/releases/download/2016-11-12/FM-Piano2-SFZ%2BWAV-20161112.7z', kind='7z', source_url='https://freepats.zenvoid.org/ElectricPiano/synthesized-piano.html', attribution='FM Piano 2 sound bank by Roberto for FreePats, recorded from Hexter; CC0 1.0.'),
    dict(pack_id='freepats_drawbar_organ', title='Drawbar Organ · FreePats', instrument='Drawbar Organ', catalog_id='organ.tonewheel', version='2019-07-12', url='https://freepats.zenvoid.org/Organ/DrawbarOrganEmulation/DrawbarOrganEmulation-SFZ-20190712.tar.xz', kind='tar.xz', source_url='https://freepats.zenvoid.org/Organ/electric-organ.html', attribution='Drawbar organ emulation by Roberto for FreePats, recorded from setBfree; CC0 1.0.'),
    dict(pack_id='freepats_church_organ', title='Church Organ · FreePats', instrument='Church Organ', catalog_id='organ.pipe', version='2019-09-24', url='https://freepats.zenvoid.org/Organ/ChurchOrganEmulation/ChurchOrganEmulation-SFZ-20190924.tar.xz', kind='tar.xz', source_url='https://freepats.zenvoid.org/Organ/pipe-organ.html', attribution='Church organ emulation by Roberto for FreePats, recorded from Aeolus; CC0 1.0.'),
]

NOTE = {'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11}

def midi(v):
    if v is None: return None
    s=str(v).strip()
    if re.fullmatch(r'-?\d+', s): return int(s)
    m=re.fullmatch(r'([A-Ga-g])([#bB]?)(-?\d+)', s)
    if not m: return None
    return (int(m.group(3))+1)*12 + NOTE[m.group(1).upper()+m.group(2).upper()]

def opcodes(text):
    text=re.sub(r'//.*$', '', text, flags=re.M)
    headers=list(re.finditer(r'<(control|global|group|region)>', text, flags=re.I))
    state={'control':{},'global':{},'group':{}}
    regions=[]
    for i,h in enumerate(headers):
        section=h.group(1).lower()
        body=text[h.end(): headers[i+1].start() if i+1<len(headers) else len(text)]
        matches=list(re.finditer(r'([A-Za-z0-9_]+)\s*=', body))
        vals={}
        for j,m in enumerate(matches):
            vals[m.group(1).lower()]=body[m.end(): matches[j+1].start() if j+1<len(matches) else len(body)].strip().strip('"')
        if section=='control': state['control'].update(vals)
        elif section=='global': state['global'].update(vals)
        elif section=='group': state['group']=vals
        else:
            merged={**state['global'], **state['group'], **vals}
            merged['_default_path']=state['control'].get('default_path','')
            regions.append(merged)
    return regions

def safe_rel(p):
    p=p.replace('\\','/').lstrip('./')
    return '/'.join(x for x in p.split('/') if x not in ('','.','..'))

def digest_payload(root):
    h=hashlib.sha256()
    for f in sorted(x for x in root.rglob('*') if x.is_file() and x.name!='manifest.json'):
        rel=f.relative_to(root).as_posix(); h.update(rel.encode()); h.update(b'\0'); h.update(f.read_bytes())
    return h.hexdigest()

def audio_info(path):
    if path.suffix.lower()=='.wav':
        with wave.open(str(path),'rb') as w: return w.getframerate(), w.getnchannels()
    return 44100,2

def download(url,path):
    req=urllib.request.Request(url,headers={'User-Agent':'Slumber-pack-builder/1.0'})
    with urllib.request.urlopen(req,timeout=120) as r, path.open('wb') as w: shutil.copyfileobj(r,w)

def extract(src,kind,dest):
    if kind=='tar.xz':
        with tarfile.open(src,'r:xz') as t: t.extractall(dest)
    elif kind=='7z': subprocess.run(['7z','x','-y',f'-o{dest}',str(src)],check=True,stdout=subprocess.DEVNULL)
    else: raise ValueError(kind)

def find_sfz(root):
    sfzs=list(root.rglob('*.sfz'))
    if not sfzs: raise RuntimeError('No SFZ file found')
    sfzs.sort(key=lambda p:(0 if 'small' in p.name.lower() else 1,len(p.parts),p.name.lower()))
    return sfzs[0]

def build(cfg):
    with tempfile.TemporaryDirectory() as td0:
        td=Path(td0); archive=td/'source'; extracted=td/'src'; extracted.mkdir()
        print('Downloading',cfg['title']); download(cfg['url'],archive); extract(archive,cfg['kind'],extracted)
        sfz=find_sfz(extracted); regs=opcodes(sfz.read_text(errors='replace'))
        if not regs: raise RuntimeError(f'No regions parsed from {sfz}')
        packroot=td/'pack'; packroot.mkdir(); zones=[]; copied={}; rrmax=1
        for r in regs:
            sample=r.get('sample')
            if not sample: continue
            raw=safe_rel('/'.join(x for x in [r.get('_default_path',''),sample] if x))
            candidates=[sfz.parent/raw,extracted/raw]
            src=next((p for p in candidates if p.is_file()),None)
            if src is None:
                found=list(extracted.rglob(Path(raw).name)); src=found[0] if found else None
            if src is None: continue
            outrel='samples/'+safe_rel(src.relative_to(extracted).as_posix()); out=packroot/outrel; out.parent.mkdir(parents=True,exist_ok=True)
            if outrel not in copied: shutil.copy2(src,out); copied[outrel]=out
            root=midi(r.get('pitch_keycenter')) or midi(r.get('key'))
            if root is None:
                mm=re.search(r'(?<!\d)(\d{2,3})(?!\d)',src.stem); root=int(mm.group(1)) if mm and 0<=int(mm.group(1))<=127 else None
            if root is None: continue
            lo=midi(r.get('lokey')) or midi(r.get('key')) or root; hi=midi(r.get('hikey')) or midi(r.get('key')) or root
            vl=int(float(r.get('lovel','1'))); vh=int(float(r.get('hivel','127'))); rr=int(float(r.get('seq_position','1')))
            rrmax=max(rrmax,int(float(r.get('seq_length',rr)))); gain=float(r.get('volume','0') or 0); tune=float(r.get('tune','0') or 0)
            zones.append(dict(file=outrel,instrument=cfg['instrument'],rootMidi=root,lowMidi=max(0,lo),highMidi=min(127,hi),velocityLow=max(1,vl),velocityHigh=min(127,vh),roundRobin=max(1,rr),articulation='sustain',trigger='ATTACK',gainDb=gain,tuneCents=tune))
        if not zones: raise RuntimeError(f'No playable zones created from {sfz}')
        rate,ch=audio_info(next(iter(copied.values())))
        manifest=dict(schemaVersion=2,packId=cfg['pack_id'],collectionId='keyboard_core',displayName=cfg['title'],version=cfg['version'],instruments=[cfg['instrument']],licenseId='CC0-1.0',attribution=cfg['attribution'],sourceUrl=cfg['source_url'],sampleFormat=next(iter(copied.values())).suffix.lstrip('.').lower(),sampleRateHz=rate,channelCount=ch,velocityLayers=max(1,len(set((z['velocityLow'],z['velocityHigh']) for z in zones))),roundRobins=max(1,rrmax),articulations=['sustain'],tuningProfileIds=['TWELVE_TET'],hasReleaseSamples=False,hasSustainSamples=True,contentSha256='',zones=zones)
        manifest['contentSha256']=digest_payload(packroot); (packroot/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
        target=OUT/f"{cfg['pack_id']}.zip"
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
            for f in sorted(packroot.rglob('*')):
                if f.is_file(): z.write(f,f.relative_to(packroot).as_posix())
        meta=dict(packId=cfg['pack_id'],catalogId=cfg['catalog_id'],title=cfg['title'],instrument=cfg['instrument'],url=f"https://raw.githubusercontent.com/Tomex777/automation-hub/main/slumber-packs/published/{target.name}",sourceUrl=cfg['source_url'],license='CC0-1.0',size=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest())
        print(json.dumps(meta)); return meta

if __name__=='__main__':
    allmeta=[build(cfg) for cfg in SOURCES]
    (OUT/'catalog.json').write_text(json.dumps({'schemaVersion':1,'packs':allmeta},indent=2))
