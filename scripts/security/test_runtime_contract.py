"""Keep Alpine ABI and the scanner OS family aligned across build and runtime."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
PIN='node:24-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53'
class RuntimeContract(unittest.TestCase):
 def test_all_external_stages_use_identical_musl_base(self):
  docker=(ROOT/'Dockerfile').read_text()
  external=[line.split()[1] for line in docker.splitlines() if line.startswith('FROM node:')]
  self.assertEqual(external,[PIN,PIN]);self.assertNotIn('apt-get',docker)
  self.assertGreaterEqual(docker.count('apk upgrade --no-cache'),2)
  self.assertGreaterEqual(docker.count('apk add --no-cache openssl ca-certificates'),2)
 def test_gate_requires_alpine_not_debian_os_inventory(self):
  template=(ROOT/'scripts/security/image-summary.tpl').read_text()
  self.assertEqual(template.count('"alpine"'),2);self.assertNotIn('"debian"',template)
 def test_ci_checks_runtime_abi_before_security_scan(self):
  ci=(ROOT/'.github/workflows/ci.yml').read_text()
  self.assertIn('/etc/alpine-release',ci)
  if (ROOT/'prisma').exists():
   self.assertIn('sharp',ci);self.assertIn('toBuffer()',ci)
   self.assertIn('prisma --version',ci)
   self.assertIn('npx prisma generate',(ROOT/'Dockerfile').read_text())
if __name__=='__main__':unittest.main()
