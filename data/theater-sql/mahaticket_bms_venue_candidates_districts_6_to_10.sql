/*
MahaTicket — BookMyShow-listed venue candidates, districts 6–10 in alphabetical order
Districts: Buldhana, Chandrapur, Chhatrapati Sambhajinagar, Dharashiv, Dhule

READ FIRST:
- This is a READ-ONLY candidate preview. It does not INSERT or UPDATE anything.
- Listing on BookMyShow is evidence of a platform listing, not a guarantee of current
  show availability, exact capacity, physical seat map, or permission for MahaTicket
  to sell tickets.
- total_capacity is NULL because a reliable, current venue capacity was not verified.
- Do not create numbered seats from a capacity estimate or generic layout.
- Compare the output with the live schema and existing venue rows before preparing
  a separate INSERT script.
*/

WITH candidates (district, name, address, city, state, total_capacity, platform, source_url, verification_status, has_seat_layout) AS (
  VALUES
  ('Buldhana','ARD Cinemall','ARD Green Valley, Malkapur Road, opposite Hero Honda Showroom','Buldhana','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/buldana/cinemas','platform_listed_unverified',false),
  ('Buldhana','Shyam Talkies','Near Weekly Market, Jaistambh Chowk','Buldhana','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/buldana/cinemas','platform_listed_unverified',false),

  ('Chandrapur','Miraj Cinemas: MDR Mall','MDR Mall and Multiplex, Survey No. 59, Wadgaon Bapat Nagar, Chandrapur 442401','Chandrapur','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chandrapur/cinemas','platform_listed_unverified',false),
  ('Chandrapur','Cinejoy Cinema (Old Abhay Talkies)','Ekori Ward, near Gandhi Chowk, Chandrapur 442402','Chandrapur','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chandrapur/cinemas','platform_listed_unverified',false),
  ('Chandrapur','Radhakrishna Talkies','Chandrapur–Nagpur Road, near Jain Temple, Civil Lines, Chandrapur 442402','Chandrapur','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chandrapur/cinemas','platform_listed_unverified',false),
  ('Chandrapur','Rajkala Cineplex','Bazar Ward, Gandhi Chowk, near Gandhibag Sahakari Bank Ltd., Chandrapur 442403','Chandrapur','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chandrapur/cinemas','platform_listed_unverified',false),
  ('Chandrapur','New Gold Star Cinema','Churhe Bada, Brahmapuri, Chandrapur district 441206','Brahmapuri','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chandrapur/cinemas','platform_listed_unverified',false),
  ('Chandrapur','Chhotu Maharaj: Rajura','E-cube, beside Lakshmi Godown, Main Road, Bamanwada, Taluka Rajura 442905','Rajura','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chandrapur/cinemas','platform_listed_unverified',false),

  ('Chhatrapati Sambhajinagar','INOX: Prozone Mall','INOX Leisure Ltd., Prozone Mall, API Corner P-80, Chikalthana Industrial Area, MIDC, 431210','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','INOX: Reliance Mall','Garkheda, Gajanan Maharaj Mandir Road, opposite Radhakrishna Mangal Karyalay, 431001','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','Anjali Ratnadeep Cinema','1, Naralibag Road, opposite Sai Abhyasika, 431001','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','Nupur Cinema (Newly Renovated)','Nupur Cinetorium, Jalna Road, Seven Hills Flyover Road, near Fire Brigade Office, 431009','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','Goldie Cinemark','Plot No. 5, Vedant Nagar, Railway Station Road, beside Vedant Hotel','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','Abhinay','Near Central Telegraph Office, Bahadurpura Mondha Road, near Jaffer Gate, 431001','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','Khinvasara Cineplex: Waluj','Khinvasara Business Centre, Lot No. X-310/1, MIDC Waluj, More Chowk, beside Police Station, 431136','Waluj','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','Khinvasara Cineplex','Opposite Zilla Parishad, Amba–Apsara Cinema Road, Aurangpura, 431001','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),
  ('Chhatrapati Sambhajinagar','MohanNova Cinemaz','Sarafa Road, Sarafa Bazar, Shahgunj, 431001','Chhatrapati Sambhajinagar','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/chhatrapati-sambhajinagar-aurangabad/cinemas','platform_listed_unverified',false),

  ('Dhule','Jyoti Chitra Mandir','City Survey No. 3488/3A, Kajwe Road, Dhule 424001','Dhule','Maharashtra',NULL::integer,'BookMyShow','https://in.bookmyshow.com/dhule/cinemas','platform_listed_unverified',false)
)
SELECT
  c.district,
  c.name,
  c.address,
  c.city,
  c.state,
  c.total_capacity,
  c.platform,
  c.source_url,
  c.verification_status,
  c.has_seat_layout,
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
Dharashiv:
No reliable BookMyShow cinema venue entry was surfaced in this search pass.
That is NOT proof that Dharashiv has no cinemas. Search using the older district
name "Osmanabad", local operator listings, and live showtimes before concluding.
*/
