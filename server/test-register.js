import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:10000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Test Univ",
      email: "test@univ.edu",
      password: "Password1!",
      role: "university",
      universityName: "Test University",
      description: "A cool univ",
      documents: []
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
