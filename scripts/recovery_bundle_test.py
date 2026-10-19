import importlib.util, io, json, pathlib, tarfile, tempfile, unittest
spec=importlib.util.spec_from_file_location('bundle',pathlib.Path(__file__).with_name('recovery_bundle.py')); m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RecoveryBundleTest(unittest.TestCase):
 def test_exact_roundtrip_and_reject_unmanifested_appledouble(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);(root/'app.js').write_text('export const safe=true;');out=root/'bundle';self.assertEqual(m.pack(root,['app.js'],out),1)
   with tarfile.open(out/'source.tar.gz','w:gz') as archive:
    for name,data in [('app.js',b'export const safe=true;'),('._app.js',b'APPLEDOUBLE')]:
     info=tarfile.TarInfo(name);info.size=len(data);archive.addfile(info,io.BytesIO(data))
   (out/'SHA256SUMS').write_text(''.join(m.digest((out/n).read_bytes())+'  '+n+'\n' for n in ['MANIFEST.json','source.tar.gz']))
   with self.assertRaisesRegex(ValueError,'unexpected archive entry'):m.verify(out)
 def test_path_and_link_rejection(self):
  for name in ['../secrets','/tmp/secret','src/._file','node_modules/file','.env.local','__MACOSX/a','.',r'C:\secret',r'src\..\secret','C:/secret']:self.assertFalse(m.safe_name(name),name)
  with tempfile.TemporaryDirectory() as tmp:
   r=pathlib.Path(tmp);(r/'real').write_text('x');(r/'link').symlink_to(r/'real')
   with self.assertRaisesRegex(ValueError,'regular'):m.pack(r,['link'],r/'out')
 def test_private_keys_are_refused_in_every_form_and_name(self):
  # Headers are assembled at run time so this source file never contains a literal key header itself.
  B,E='-----'+'BEGIN ','-----'+'END '; K='PRIVATE KEY-----'
  samples={'service.json':('{"type":"service_account","private_key":"'+B+K+'\\nMIIE\\n'+E+K+'\\n"}').encode(),
   'deploy_key':(B+'OPENSSH '+K+'\nb3Blbg==\n'+E+'OPENSSH '+K+'\n').encode(),
   'test-fixture.pem':(B+K+'\nMIIE\n'+E+K+'\n').encode(),
   'rsa.pem':(B+'RSA '+K+'\nMIIE\n'+E+'RSA '+K+'\n').encode()}
  for name,data in samples.items():
   with tempfile.TemporaryDirectory() as tmp:
    r=pathlib.Path(tmp);(r/name).write_bytes(data)
    with self.assertRaisesRegex(ValueError,'private key in '+name):m.pack(r,[name],r/'out')
  with tempfile.TemporaryDirectory() as tmp:
   r=pathlib.Path(tmp);(r/'ok.ts').write_text('export const label = "BEGIN";');self.assertEqual(m.pack(r,['ok.ts'],r/'out'),1)
if __name__=='__main__':unittest.main()
