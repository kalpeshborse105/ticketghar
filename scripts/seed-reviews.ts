import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const raw = (process.env.DATABASE_URL || '')
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

const pool = new Pool({
  connectionString: raw,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await pool.query('ALTER TABLE public.event_reviews ALTER COLUMN user_id DROP NOT NULL;');
  const evs = await pool.query('SELECT id, title FROM events');
  console.log(`Found ${evs.rows.length} events`);
  
  const sampleReviews = [
    {
      name: 'सचिन कुलकर्णी',
      email: 'sachin.kulkarni@gmail.com',
      city: 'पुणे',
      rating: 5,
      comment: 'अप्रतिम नाटक! सर्व कलाकारांचा अभिनय आणि संवादफेक लाजवाब आहे.',
    },
    {
      name: 'प्रिया देशमुख',
      email: 'priya.deshmukh@gmail.com',
      city: 'मुंबई',
      rating: 5,
      comment: 'खूपच सुरेख अनुभव. संगीत आणि प्रकाशयोजना मनाला भिडणारी होती. नक्की पहा!',
    },
    {
      name: 'रोहित पाटील',
      email: 'rohit.patil@gmail.com',
      city: 'नाशिक',
      rating: 4,
      comment: 'कुटुंबासोबत आवर्जून पाहावे असा प्रयोग. शेवटपर्यंत खिळवून ठेवतो.',
    },
    {
      name: 'अनिकेत जोशी',
      email: 'aniket.joshi@gmail.com',
      city: 'ठाणे',
      rating: 5,
      comment: 'Housefull शो! बालगंधर्व रंगमंदिरातील टाळ्यांचा कडकडाट अंगावर रोमांच आणणारा होता.',
    },
  ];

  for (const ev of evs.rows) {
    for (const r of sampleReviews) {
      await pool.query(
        `INSERT INTO event_reviews (event_id, user_email, user_name, city, rating, comment, verified_attendance)
         VALUES ($1, $2, $3, $4, $5, $6, 1)
         ON CONFLICT DO NOTHING`,
        [ev.id, r.email, r.name, r.city, r.rating, r.comment]
      );
    }
  }

  const c = await pool.query('SELECT COUNT(*) FROM event_reviews');
  console.log(`Total event_reviews now: ${c.rows[0].count}`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
