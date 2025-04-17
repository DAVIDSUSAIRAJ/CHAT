import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbwxnytdfqwfboudpwub.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid3hueXRkZnF3ZmJvdWRwd3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTM5MjQsImV4cCI6MjA2MDI4OTkyNH0.BdTOR4WgdEPpJuAJPnVKUamJSL4kqfRkK0w88Wq9IwQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Your user IDs from authentication
const davidId = '14987335-8c79-479b-b008-a9fafafc671a';
const prasanthId = '1093a98a-b0bf-4b60-9836-c0f95b4c3de7';
const rabeekId = '57a38493-552c-4c17-a552-32bb496aebd2';

async function addFriendships() {
  // Add friendship between David and Prasanth
  const { error: error1 } = await supabase
    .from('friends')
    .insert([
      {
        user_id: davidId,
        friend_id: prasanthId,
        status: 'accepted'
      }
    ]);

  if (error1) console.error('Error adding David-Prasanth friendship:', error1);

  // Add friendship between David and Rabeek
  const { error: error2 } = await supabase
    .from('friends')
    .insert([
      {
        user_id: davidId,
        friend_id: rabeekId,
        status: 'accepted'
      }
    ]);

  if (error2) console.error('Error adding David-Rabeek friendship:', error2);

  console.log('Friend relationships added successfully!');
}

addFriendships(); 