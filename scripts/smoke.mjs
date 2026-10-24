import assert from 'node:assert/strict'

// Synthetic disposable CI database only; never point this at a public service.
const base = new URL(process.env.SMOKE_URL || 'http://127.0.0.1:3504')
assert.equal(base.hostname, '127.0.0.1')
const request = (path, options = {}) => fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options })
assert.equal((await request('/api/health')).status, 200)
assert.equal((await request('/login')).status, 200)
const credentials = { email: `ci-${Date.now()}@example.invalid`, password: 'Synthetic-CI-password-123', name: 'Synthetic CI' }
for (const action of ['signup', 'login']) {
  const response = await request(`/api/auth/${action}`, { method: 'POST', body: new URLSearchParams(credentials) })
  assert.equal(response.status, 303, `${action} must redirect using GET`)
  assert.equal(response.headers.get('location'), `${process.env.APP_URL}/dashboard`)
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /Secure/i)
  assert.match(cookie, /SameSite=lax/i)
  assert.equal((await request('/dashboard', { headers: { Cookie: cookie.split(';')[0] } })).status, 200)
}
const logout = await request('/api/auth/logout', { method: 'POST' })
assert.equal(logout.status, 303)
assert.equal(logout.headers.get('location'), `${process.env.APP_URL}/login`)
console.log('PASS: database health, signup, session, login, logout; no payment calls')
