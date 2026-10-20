import json, os, pathlib, re, subprocess, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parent.parent
class NativeReleaseGuardTest(unittest.TestCase):
 def test_xcode_build_phase_stops_after_rejected_release_identity(self):
  source=(ROOT/'mobile/ios/Runner.xcodeproj/project.pbxproj').read_text()
  phases=re.findall(r'shellScript = ("(?:\\.|[^"\\])*");',source)
  script=next(json.loads(p) for p in phases if 'verify-release.sh' in p)
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);backend=root/'packages/flutter_tools/bin/xcode_backend.sh';backend.parent.mkdir(parents=True)
   marker=root/'build-started';backend.write_text('#!/bin/sh\ntouch "'+str(marker)+'"\n')
   env={**os.environ,'SRCROOT':str(ROOT/'mobile/ios'),'FLUTTER_ROOT':str(root),'CONFIGURATION':'Release'}
   env.pop('RESCUE_BUNDLE_ID',None);env.pop('DEVELOPMENT_TEAM',None)
   result=subprocess.run(['/bin/sh','-c',script],env=env,capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertFalse(marker.exists(), 'A failed release guard must prevent Flutter build')
   env['CONFIGURATION']='Debug'
   self.assertEqual(subprocess.run(['/bin/sh','-c',script],env=env,capture_output=True).returncode,0);self.assertTrue(marker.exists())
if __name__=='__main__':unittest.main()
