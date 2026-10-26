import numpy as np, wave, sys
SR=44100; D=25.2; BPM=100; B=60/BPM
N=int(SR*D); out=np.zeros((N,2),dtype=np.float64)
rng=np.random.default_rng(7)
def add(sig,t,pan=0.0,g=1.0):
    i=int(t*SR)
    if i>=N: return
    s=sig[:N-i]*g
    out[i:i+len(s),0]+=s*(1-max(pan,0)); out[i:i+len(s),1]+=s*(1+min(pan,0))
def tt(d): return np.arange(int(SR*d))/SR
def env(d,a=0.005,r=None,k=6):
    t=tt(d); r=r or d; e=np.minimum(t/a,1)*np.exp(-k*t/r); return e
def kick():
    t=tt(0.32); f=45+90*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*9)*1.0
def hat():
    t=tt(0.06); n=rng.standard_normal(len(t)); n=np.diff(n,prepend=0); return n*np.exp(-t*90)*0.25
def clap():
    t=tt(0.18); n=rng.standard_normal(len(t)); n=np.diff(n,prepend=0); return n*np.exp(-t*26)*0.35
def pluck(f,d=0.35):
    t=tt(d); s=np.sin(2*np.pi*f*t)+0.4*np.sin(2*np.pi*2*f*t)+0.15*np.sin(2*np.pi*3*f*t); return s*np.exp(-t*11)*0.18
def bass(f,d):
    t=tt(d); s=np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*2*f*t)*np.exp(-t*8); e=np.minimum(t/0.01,1)*np.exp(-t*3.2); return s*e*0.5
def pad(freqs,d):
    t=tt(d); s=np.zeros_like(t)
    for f in freqs:
        for det in (-0.004,0,0.004):
            s+=np.sin(2*np.pi*f*(1+det)*t+rng.uniform(0,6.28))
    e=np.minimum(t/0.6,1)*np.minimum((d-t)/0.5,1); return s*e*0.035
def whoosh(d=0.6,up=True):
    t=tt(d); n=rng.standard_normal(len(t)); 
    # crude sweep: moving average with shrinking window via cumulative filter -> use two-pole filtering by chunks
    y=np.zeros_like(n); a=np.linspace(0.02,0.5,len(t)) if up else np.linspace(0.5,0.02,len(t))
    lp=0.0
    for i in range(len(n)):
        lp+=a[i]*(n[i]-lp); y[i]=n[i]-lp  # high-pass-ish, opens as a grows
    e=np.sin(np.pi*np.clip(t/d,0,1))**2
    return y*e*0.22
def pop(f=700):
    t=tt(0.18); ph=2*np.pi*np.cumsum(f*(1+0.5*np.exp(-t*30)))/SR; return np.sin(ph)*np.exp(-t*22)*0.35
def ding(f,d=1.4):
    t=tt(d); s=np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*2.01*f*t)+0.15*np.sin(2*np.pi*3.97*f*t); return s*np.exp(-t*2.6)*0.3
T=[0,2.4,6.0,9.6,13.2,16.8,20.4]
chords=[[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392],[196,246.94,293.66]]
roots=[110,87.31,130.81,98]
arp_idx=[0,1,2,1,0,1,2,1]
nbars=int(D/(4*B))+1
for bar in range(nbars):
    t0=bar*4*B
    ch=chords[bar%4]
    add(pad(ch,4*B+0.3),t0,0,1.0)
    if t0>=2.4-1e-6 and t0<24:
        for step in range(8):
            ts=t0+step*(B/2)
            add(bass(roots[bar%4],B/2*0.95),ts,0,1.0 if step%2==0 else 0.7)
        for step in range(16):
            ts=t0+step*(B/4)
            f=ch[arp_idx[step%8]]*2
            add(pluck(f),ts,(-0.4 if step%2 else 0.4),0.8)
# drums from 2.4s
for k in range(int(D/B)):
    ts=k*B
    if ts>=2.4-1e-6 and ts<23.4:
        add(kick(),ts,0,0.95)
        add(hat(),ts+B/2,0.2,1.0)
        if k%2==1: add(clap(),ts,0,0.8)
# scene transitions
for i,s in enumerate(T[1:],start=1):
    add(whoosh(0.5,True),s-0.45,0,1.0)
    add(pop(620+60*i),s,0,1.0)
# end: bright chord and ding
add(ding(880),20.4+0.15,0.2,1.0); add(ding(1318.5),20.4+0.45,-0.2,0.8); add(ding(1760),20.4+0.9,0.2,0.6)
# master
m=np.abs(out).max(); out/=m
t=np.arange(N)/SR
fade=np.clip(t/0.25,0,1)*np.clip((D-t)/1.6,0,1)
out*= (0.85*fade)[:,None]
pcm=(np.clip(out,-1,1)*32767).astype(np.int16)
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok',D)
