import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbwxnytdfqwfboudpwub.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid3hueXRkZnF3ZmJvdWRwd3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTM5MjQsImV4cCI6MjA2MDI4OTkyNH0.BdTOR4WgdEPpJuAJPnVKUamJSL4kqfRkK0w88Wq9IwQ';

const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  {
    id: '14987335-8c79-479b-b008-a9fafafc671a',
    username: 'David',
    email: 'davidsusairaj1996@gmail.com'
  },
  {
    id: '1093a98a-b0bf-4b60-9836-c0f95b4c3de7',
    username: 'Prasanth',
    email: 'prasanth@gmail.com'
  },
  {
    id: '57a38493-552c-4c17-a552-32bb496aebd2',
    username: 'Rabeek',
    email: 'rabeek@gmail.com'
  }
];

async function addUsers() {
  for (const user of users) {
    const { error } = await supabase
      .from('users')
      .upsert([user], { 
        onConflict: 'id'  // Update if exists, insert if doesn't exist
      });

    if (error) {
      console.error(`Error adding user ${user.username}:`, error);
    } else {
      console.log(`Successfully added/updated user ${user.username}`);
    }
  }
}

addUsers(); 