
import axios from "axios";

async function test() {
  try {
    const loginRes = await axios.post("http://localhost:5002/api/v1/public/auth/login", {
      email: "admin@enterprise.com",
      password: "password123"
    });
    console.log(loginRes.data);
  } catch (err) {
    console.log(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}
test();

