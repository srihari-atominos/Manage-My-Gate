async function run() {
  const customerId = 'C-14FF145F18B24A9';
  const rawKey = 'WrongPassword.123';
  const base64Key = Buffer.from(rawKey).toString('base64');
  const countryCode = '91';
  
  const url = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(base64Key)}&scope=NEW&country=${encodeURIComponent(countryCode)}`;
  const response = await fetch(url, {
    method: 'GET',
  });
  
  console.log("Response OK:", response.ok);
  console.log("Response Status:", response.status);
  const data = await response.json();
  console.log("Data:", data);
}
run();
