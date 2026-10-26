/*
MahaTicket — BookMyShow-listed cinema candidates, districts 11–15
Alphabetical district batch:
Gadchiroli, Gondia, Hingoli, Jalgaon, Jalna

READ-ONLY PREVIEW ONLY:
- No INSERT, UPDATE, DELETE, event/session/ticket/seat creation occurs.
- BookMyShow listing supports "listed on ticketing platform", not guaranteed
  current show availability, current licence, physical capacity, exact seat map,
  or permission for MahaTicket to sell tickets.
- Capacity is NULL unless verified from a reliable venue-specific source.
- Compare names/locations against the database and inspect schema.ts before any
  separately prepared insertion SQL.
*/

WITH candidates (
  district, name, address, city, state, total_capacity,
  platform, source_url, verification_status, has_seat_layout
) AS (
  VALUES
  ('Gadchiroli','PictureTime MCG Cinemas','Mobile Digital Movie Theatre, near Swaraj Health, Maharashtra 442605','Gadchiroli','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/gadchiroli/cinemas','platform_listed_unverified',false),

  ('Gondia','Gold Cinema, Govindpur Road','P. A. Mills Compound, Govindpur Road, Bajaj Nagar, Gondia, Maharashtra 441601','Gondia','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/gondia/cinemas','platform_listed_unverified',false),
  ('Gondia','Gold Cinema: City Mall','City Mall, opposite Circus Ground, Ganesh Nagar, Main Road, Gondia, Maharashtra 441601','Gondia','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/gondia/cinemas','platform_listed_unverified',false),
  ('Gondia','EOS Cinemas: Gondia','2nd Floor, Platinum Plaza, Ward No. 9, Lohiya Ward, Pal Chowk, Rail Toly, Bhandarkar Road, near State Bank of India, Gondia, Maharashtra 441614','Gondia','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/gondia/cinemas','platform_listed_unverified',false),
  ('Gondia','Prabhat Cinema: Gondia','Vithal Nagar, Bajaj Nagar, Sales Tax Office Road, Gondia, Maharashtra 441601','Gondia','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/gondia/cinemas','platform_listed_unverified',false),

  ('Hingoli','Sanskar Cineplex: Hingoli','Hingoli, Maharashtra','Hingoli','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/hingoli/cinemas','platform_listed_unverified',false),

  ('Jalgaon','PVR: Kirti Mall','2nd Floor, Kirti Mall, M. G. Road, Navi Peth, Jalgaon, Maharashtra 425001','Jalgaon','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalgaon/cinemas','platform_listed_unverified',false),
  ('Jalgaon','Star Multiplex: Jalgaon','5th Floor, Nayantara Mall, Pratap Nagar, Jalgaon, Maharashtra 425001','Jalgaon','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalgaon/cinemas','platform_listed_unverified',false),
  ('Jalgaon','Regal Metro Cinema: Jalgaon','Mahatma Gandhi Road, Jaikisan Wadi, near Rajesh Radio, Jalgaon, Maharashtra 425001','Jalgaon','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalgaon/cinemas','platform_listed_unverified',false),
  ('Jalgaon','Morya Cineplex: Erandol','Mahasawad Naka, Onkaro Jadhav Nagar, Erandol, Maharashtra 425109','Erandol','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalgaon/cinemas','platform_listed_unverified',false),
  ('Jalgaon','Raj Multiplex: Nashirabad','Gate No. 1026A, Sunasgaon Road, Nashirabad, Jalgaon district, Maharashtra 425309','Nashirabad','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalgaon/cinemas','platform_listed_unverified',false),

  ('Jalna','Krishna Multiplex: Jalna','Krishna Mall, Krishna Vihar, Mantha–Ambad Bypass Ring Road, Jalna, Maharashtra 431203','Jalna','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalna/cinemas','platform_listed_unverified',false),
  ('Jalna','Ratnadeep Cinema: Jalna','Bus Stand Road, Rahman Ganj, next to Kshirsagar Complex, Jalna, Maharashtra 431203','Jalna','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalna/cinemas','platform_listed_unverified',false),
  ('Jalna','Neelam Cineplex: Jalna','Railway Station Road, Nariman Nagar, Jalna, Maharashtra 431213','Jalna','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalna/cinemas','platform_listed_unverified',false),
  ('Jalna','Natraj Cinema: Jalna','Lokhandi Pool Road, Sangram Nagar, Rahman Ganj, Jalna, Maharashtra 431203','Jalna','Maharashtra',NULL::integer,
   'BookMyShow','https://in.bookmyshow.com/jalna/cinemas','platform_listed_unverified',false)
)
SELECT
  c.district, c.name, c.address, c.city, c.state,
  c.total_capacity, c.platform, c.source_url,
  c.verification_status, c.has_seat_layout,
  v.id AS existing_venue_id,
  CASE
    WHEN v.id IS NULL THEN 'CANDIDATE_NOT_FOUND_BY_EXACT_NAME_AND_CITY'
    ELSE 'POSSIBLE_EXISTING_MATCH_REVIEW'
  END AS database_match_status
FROM candidates c
LEFT JOIN venues v
  ON lower(trim(v.name)) = lower(trim(c.name))
 AND lower(trim(v.city)) = lower(trim(c.city))
ORDER BY c.district, c.city, c.name;

/*
Research notes:
- Gadchiroli: BookMyShow lists PictureTime MCG Cinemas and has dated showtime pages.
- Gondia: BookMyShow lists Gold Cinema (Govindpur Road), Gold Cinema (City Mall),
  EOS Cinemas, and Prabhat Cinema.
- Hingoli: BookMyShow identifies Sanskar Cineplex in its Hingoli cinema listing;
  the general listing page has limited venue detail.
- Jalgaon: BookMyShow lists PVR Kirti Mall, Star Multiplex, Regal Metro Cinema,
  Morya Cineplex (Erandol), and Raj Multiplex (Nashirabad).
- Jalna: BookMyShow lists Krishna Multiplex, Ratnadeep Cinema, Neelam Cineplex,
  and Natraj Cinema. Some search-result page versions omit Natraj, so re-check
  its current listing/showtimes before marking it operational.
- A platform listing does not establish venue capacity or a real seat layout.
*/
