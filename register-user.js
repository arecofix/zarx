
const { createClient } = require('@supabase/supabase-js');

// You need to fill these with your REAL project values from environment.ts
// I will read them from environment.ts in a moment, but for now I'll use placeholders 
// and ask you to confirm or I'll try to grep them.
const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function register() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing credentials");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const email = 'ezequielenrico1015@hotmail.com';
    const password = '#Arecofix3015';

    console.log(`Attempting to register ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Ezequiel Enrico',
                username: 'ezequiel_admin'
            }
        }
    });

    if (error) {
        console.error('Error:', error.message);
        if (error.status === 429) console.error("Still Rate Limited!");
    } else {
        console.log('Success!', data);
        console.log('Please check email for confirmation link.');
    }
}

register();
