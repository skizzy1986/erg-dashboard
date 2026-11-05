import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# Phase-specific activation estimates (0..1) per depth: moment-driven (dynamic moments) x contraction-mode factor.
import numpy as np
NOLEN={'Gemellus superior','Gemellus inferior','Obturator internus','Obturator externus','Quadratus femoris','Pectineus','Popliteus','Achilles (calcaneal) tendon'}
def modes_from_length(L, S, thr=4.0):
    """phase-level MTU length trend: net change from standing to 90% depth. +1 lengthens on the way down, -1 shortens, 0 near-isometric (<thr %)."""
    dL=np.interp(0.9,S,L)-100.0
    tr=1 if dL>thr else (-1 if dL<-thr else 0)
    return np.full(len(S),tr), dL
def mode_factor(trend, phase, S):
    # descent: lengthening = eccentric (0.62), shortening = concentric (1.0), near-isometric 0.82
    # ascent : the reverse; isometric 0.95. Around the reversal (S>0.93) blend both towards 0.85 so the phases meet.
    if phase=='desc': mf=np.where(trend>0,0.62,np.where(trend<0,1.0,0.82))
    else:             mf=np.where(trend>0,1.0,np.where(trend<0,0.62,0.95))
    w=np.clip((S-0.93)/0.07,0,1); return mf*(1-w)+0.85*w
def activation_tables3(META, rows, fd, fa, MLEN):
    S=np.array(META['S'])
    Mh=np.array([r['Mhip'] for r in rows]); Mk=np.array([r['Mknee'] for r in rows]); Ma=np.array([r['Mank'] for r in rows]); Ml=np.array([r['Mlum'] for r in rows])
    Href,Kref,Lref=Mh.max(),Mk.max(),Ml.max()
    names=[m['name'] for m in META['muscles']]; T={}
    trend={}
    for i,n in enumerate(names):
        if i in MLEN and n not in NOLEN: trend[n]=modes_from_length(MLEN[i],S)[0]
    def tr(n, default=0): return trend.get(n, np.full(len(S),default))
    out={'desc':{},'asc':{}}
    for ph,f in (('desc',fd),('asc',fa)):
        hp=np.clip(Mh*f,0,None)/Href; kn=np.clip(Mk*f,0,None)/Kref; lm=np.clip(Ml*f,0,None)/Lref
        hflex=np.clip(-Mh*f,0,None)/40.0; lflex=np.clip(-Ml*f,0,None)/50.0
        an=np.clip(Ma*f,0,None)/60.0; d=S
        mf=lambda n,default=0: mode_factor(tr(n,default),ph,S)
        A={}
        for n in ['Vastus lateralis','Vastus medialis']: A[n]=0.04+0.68*kn*mf(n)
        A['Vastus intermedius']=0.04+0.64*kn*mf('Vastus intermedius')
        A['Rectus femoris']=0.03+0.33*kn*mf('Rectus femoris')
        A['Gluteus maximus']=0.03+0.52*hp*(0.55+0.45*d)*mf('Gluteus maximus')
        am=0.50*hp*(0.25+0.75*d**1.5)
        A['Adductor magnus']=0.03+am*mf('Adductor magnus'); A['Adductor minimus']=0.03+0.9*am*mf('Adductor minimus')
        A['Adductor longus']=0.05+0.28*hp*d**2*mf('Adductor longus'); A['Adductor brevis']=0.04+0.24*hp*d**2*mf('Adductor brevis')
        A['Gracilis']=0.03+0.10*d*mf('Gracilis')
        for n,s_ in [('Biceps femoris (long head)',0.17),('Semitendinosus',0.16),('Semimembranosus',0.17)]: A[n]=0.06+(0.06*d+s_*hp)*mf(n)
        A['Biceps femoris (short head)']=0.03+0.05*kn*mf('Biceps femoris (short head)')
        A['Gluteus medius']=0.07+0.23*hp*mf('Gluteus medius'); A['Gluteus minimus']=0.05+0.16*hp*mf('Gluteus minimus')
        A['Piriformis']=0.05+0.15*hp*mf('Piriformis',1)
        for n in ['Obturator internus','Obturator externus','Gemellus superior','Gemellus inferior','Quadratus femoris']: A[n]=0.05+0.13*hp*mode_factor(np.ones(len(S)),ph,S)
        A['Tensor fasciae latae']=0.05+0.10*hp*mf('Tensor fasciae latae'); A['Sartorius']=0.04+0.04*d
        ip=0.04+0.22*np.clip(hflex,0,1)+0.03*d
        A['Iliacus']=ip; A['Psoas major']=ip
        A['Pectineus']=0.04+0.10*d
        A['Popliteus']=0.06+0.10*kn
        A['Soleus']=0.06+(0.22*an+0.06*d)*mf('Soleus'); A['Gastrocnemius (medial head)']=0.05+(0.18*an+0.05*d)*mf('Gastrocnemius (medial head)')
        A['Gastrocnemius (lateral head)']=0.04+(0.14*an+0.05*d)*mf('Gastrocnemius (lateral head)'); A['Plantaris']=A['Gastrocnemius (lateral head)']
        A['Tibialis anterior']=(0.08+0.14*d) if ph=='desc' else (0.05+0.08*d)
        A['Tibialis posterior']=0.08+(0.10*an+0.08*d)*mf('Tibialis posterior'); A['Flexor hallucis longus']=0.06+(0.08*an+0.08*d)*mf('Flexor hallucis longus')
        A['Flexor digitorum longus']=0.05+(0.06*an+0.06*d)*mf('Flexor digitorum longus')
        A['Fibularis longus']=0.06+(0.08*an+0.08*d)*mf('Fibularis longus'); A['Fibularis brevis']=0.05+(0.07*an+0.07*d)*mf('Fibularis brevis')
        for n in ['Extensor digitorum longus','Extensor hallucis longus','Fibularis tertius']: A[n]=(0.04+0.06*d) if ph=='desc' else (0.03+0.04*d)
        iso=0.85 if ph=='desc' else 1.0                         # spine held still: isometric, slightly lower while lowering
        ers=0.10+0.50*lm*iso
        for n in ['Iliocostalis lumborum','Iliocostalis thoracis','Longissimus thoracis','Spinalis thoracis','Multifidus','Semispinalis thoracis']: A[n]=ers
        A['Quadratus lumborum']=0.06+0.30*lm*iso
        A['Rectus abdominis']=0.08+(0.04*lm+0.10*np.clip(lflex,0,1))*iso
        A['External oblique']=0.18+(0.10*lm+0.06*np.clip(lflex,0,1))*iso; A['Internal oblique']=0.22+(0.12*lm+0.06*np.clip(lflex,0,1))*iso
        A['Serratus posterior inferior']=0.08+0.06*lm*iso
        A['Latissimus dorsi']=0.26+0.08*lm*iso
        out[ph]={k:np.clip(v,0,1) for k,v in A.items()}
        out[ph]['_shelf']=0.70+0.30*f                         # upper-back shelf load scales with the bar's effective weight
    return out, trend
