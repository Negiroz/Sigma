import axios from 'axios';

async function test() {
    try {
        const res = await axios.get('http://localhost:3011/api/dashboard/data-entry/monthly-merit', {
            params: { month: 4, year: 2026, companyId: 2 }
        });
        const johanmy = res.data.find(e => e.name.includes('Johanmy'));
        console.log('Johanmy data:', JSON.stringify(johanmy, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

test();
