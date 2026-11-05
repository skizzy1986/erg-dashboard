import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/base.py').read())
import pickle
exec(open(SP+'v3/act3.py').read())
rows=pickle.load(open(SP+'v3/rows3.pkl','rb')); P3=np.load(SP+'v3/phase3.npz'); MLEN=pickle.load(open(SP+'v3/mlen3.pkl','rb'))
out,trend=activation_tables3(META,rows,P3['fd'],P3['fa'],MLEN)
S=np.array(META['S'])
for n in ['Vastus lateralis','Gluteus maximus','Adductor magnus','Biceps femoris (long head)','Rectus femoris','Soleus','Gastrocnemius (medial head)','Longissimus thoracis']:
    print('%-28s mode(desc) %s'%(n,''.join({1:'L',-1:'S',0:'i'}[int(x)] for x in trend.get(n,np.zeros(41)))))
    print('   desc',np.round(100*out['desc'][n][::5]).astype(int),'  asc',np.round(100*out['asc'][n][::5]).astype(int))
