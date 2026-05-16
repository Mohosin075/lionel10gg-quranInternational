import axios from 'axios';

async function test() {
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=hello';
    const res = await axios.get(url);
    console.log('Success:', res.data[0][0][0]);
  } catch (error: any) {
    console.error('Error:', error.response?.status, error.response?.statusText);
  }
}

test();
