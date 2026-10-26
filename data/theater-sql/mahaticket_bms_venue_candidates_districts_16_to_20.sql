-- MahaTicket candidate venue review: districts 16-20 (alphabetical)
-- Read-only preview. No INSERT/UPDATE/DELETE; no capacity or seat-map assumptions.
-- BookMyShow listing is discovery evidence only, not proof of current operation or sales authorization.
-- Validate addresses, duplicate venues, current operations, seat layouts, capacities and organizer authorization before importing.

WITH candidate_venues (
  district, venue_name, city, address, source_url,
  verified_capacity, has_verified_seat_layout, review_status
) AS (
  VALUES
  ('Kolhapur', 'INOX: Reliance Mega Mall, Kolhapur', 'Kolhapur', '2nd Floor, Reliance Mega Mall, Old Dalal Market, Laxmipuri, Kolhapur, Maharashtra 416002', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'PVR: DYP City, Kolhapur', 'Kolhapur', 'DYP City Mall, 3rd Floor, 2104/5, E-Ward, Near Opal Hotel, Kavala Naka, Kolhapur, Maharashtra 416003', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'Prabhat Royal Cineplex: Kolhapur', 'Kolhapur', 'Prabhat Cinema, 1526 C, Laxmipuri, Near Laxmipuri Police Station, Kolhapur, Maharashtra 416002', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'Padma Cinema: Kolhapur', 'Kolhapur', '1550, C Ward, Laxmipuri, Near Jain Mandir, Opposite K M C College, Kolhapur, Maharashtra 416002', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'Shahu Cinema: Kolhapur', 'Kolhapur', '1552/C, Laxmipuri, Kolhapur, Maharashtra 416002', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'Remolo Ganesh Cinemaz: Gandhinagar', 'Gandhinagar, Kolhapur', 'Gandhinagar (Mudshingi), Taluka Karvir, Kolhapur, Maharashtra 416119', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'Rajaram ChitraMandir: Vadgaon', 'Peth Vadgaon, Kolhapur', 'Latwade Road, Peth Vadgaon, Kolhapur, Maharashtra 416112', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'SHREERAM CITYPLEX: Vadgaon', 'Peth Vadgaon, Kolhapur', '128/16, Near Bank Of India, Yadav Colony, Pethvadgaon, Kolhapur, Maharashtra 416112', 'https://in.bookmyshow.com/kolhapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Kolhapur', 'Maratha Chitra Mandir: Gadhinglaj', 'Gadhinglaj, Kolhapur', 'Doctor''s Colony, Gadhinglaj-Chandgad Road, Gadhinglaj, Maharashtra 416502', 'https://in.bookmyshow.com/kolhapur/venue-list', NULL::integer, false, 'platform_listed_unverified'),
  ('Latur', 'PVR: Latur', 'Latur', 'Plot No-X1/X2, MIDC, Ekmat Chowk, Barshi Road, Latur, Maharashtra 413512', 'https://in.bookmyshow.com/latur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Latur', 'New Rama Chitra Mandir (Only Recliner & Sofa): Latur', 'Latur', 'Silver Jubilee Road, Near Ashoka Hotel, Sawe Wadi, Latur, Maharashtra 413512', 'https://in.bookmyshow.com/latur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Latur', 'Yashoda Cinema: Latur', 'Latur', 'Papvinash Mandir Road, Vyankatesh Nagar, Sawe Wadi, Near Old Renapur Naka, Latur, Maharashtra 413512', 'https://in.bookmyshow.com/latur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'Metro INOX Cinemas: Marine Lines', 'Mumbai', 'M.G. Road, Dhobitalao Junction, Mumbai, Maharashtra 400020', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'PVR ICON: Phoenix Palladium, Lower Parel', 'Mumbai', 'High Street Phoenix, Senapati Bapat Marg, Lower Parel West, Mumbai, Maharashtra 400013', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'Sterling Cineplex: Fort', 'Mumbai', '65, Murzban Road, Azad Maidan, Fort, Mumbai, Maharashtra 400001', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'INOX Laserplex: CR2, Nariman Point', 'Mumbai', 'CR2 Mall, 2nd Floor, Barrister Rajni Patel Marg, Nariman Point, Mumbai, Maharashtra 400021', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'EROS INOX IMAX Cinema: Churchgate', 'Mumbai', 'Cambata Building, 42, Maharshi Karve Road, Churchgate, Mumbai, Maharashtra 400020', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'Regal Cinema: Colaba', 'Mumbai', 'Old Custom House Road, Apollo Bunder, Colaba, Mumbai, Maharashtra 400005', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'Maratha Mandir: Mumbai Central', 'Mumbai', '22, Maratha Mandir Marg, Agripada, Mumbai, Maharashtra 400008', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai City', 'Roxy Cinema: Charni Road', 'Mumbai', 'Jewel Building, 23-27 New Queens Road, Opera House, Mumbai, Maharashtra 400004', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'INOX Megaplex: Sky City Mall, Borivali', 'Mumbai', 'Oberoi Sky City Mall, Datta Pada Road, Borivali East, Mumbai, Maharashtra 400066', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'INOX: Megaplex, Inorbit Mall, Malad', 'Mumbai', 'Inorbit Mall, Goregaon-Malad Link Road, Malad West, Mumbai, Maharashtra 400064', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'INOX: R-City, Ghatkopar', 'Mumbai', '3rd Floor, R City Mall, LBS Marg, Ghatkopar West, Mumbai, Maharashtra 400086', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'PVR:C&B Square Chakala Andheri East', 'Mumbai', '127, Andheri-Kurla Road, Chakala, Andheri East, Mumbai, Maharashtra 400059', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'HDFC Millennia PVR ICON: Oberoi Mall', 'Mumbai', '3rd Floor, Oberoi Mall, Goregaon East, Mumbai, Maharashtra 400063', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'PVR ICON: Infiniti Andheri West', 'Mumbai', 'Infinity Mall, New Link Road, Andheri West, Mumbai, Maharashtra 400053', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'Cinepolis: Fun Republic Mall, Andheri West', 'Mumbai', 'Level 4, Shah Industrial Estate, Veera Desai Road, Andheri West, Mumbai, Maharashtra 400053', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'MovieMax: Huma, Kanjurmarg', 'Mumbai', 'Huma Mall, LBS Road, Kanjurmarg West, Mumbai, Maharashtra 400078', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'Miraj Cinemas: IMAX, Wadala', 'Mumbai', 'Ajmera I-Land Road, Bhakti Park, Wadala East, Mumbai, Maharashtra 400037', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Mumbai Suburban', 'MOVIETIME Cubic Mall: Chembur', 'Mumbai', 'Old Basant Cinema, Vasant Vihar Complex Road, Chembur, Mumbai, Maharashtra 400074', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Cinepolis: VR Mall, Nagpur', 'Nagpur', 'Near Medical Square, Rambagh Road, Nagpur, Maharashtra 440003', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'MovieMax: Eternity, Nagpur', 'Nagpur', '4th Floor, Variety Square, Sitabuldi, Nagpur, Maharashtra 440012', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Skylight (Sangam) Cinema: Nagpur', 'Nagpur', '369-A, Ayab Layout, Tiranga Square, Sakkardara, Nagpur, Maharashtra 440009', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'INOX: Jaswant Tuli Mall', 'Nagpur', '1st Floor, Jaswant Tuli Mall, Indora Square, Kamptee Road, Nagpur, Maharashtra 440017', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'AM Cinema: Manish Nagar', 'Nagpur', '2nd Floor, Jayanti Nagri 5 Mall, Besa Road, Nagpur, Maharashtra 440027', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'AM Cinema Iconic: Jayanti Nagar VII', 'Nagpur', 'Besa-Pipla Road, New Hanuman Nagar, Manish Nagar, Nagpur, Maharashtra 440034', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'AM Cinema: Jaiprakash Nagar', 'Nagpur', '26 T3, Jaiprakash Nagar Wardha Road, inside Jai Prakash Nagar Metro Station, Nagpur, Maharashtra 440025', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'AM Cinema: Koradi', 'Koradi, Nagpur', 'Near Naivedhyam Celebration, New Nanda, Koradi, Maharashtra 441111', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Buty Cineplex-Sadar', 'Nagpur', 'Mount Road Extension, Liberty Chowk, Sadar, Nagpur, Maharashtra 440001', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Liberty Cinema: Sadar', 'Nagpur', 'Bazar Road, Sadar, Nagpur, Maharashtra 440001', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Kamal Cineplex: Nagpur', 'Nagpur', 'Kamal Chowk, Panchpaoli Road, near Indora Chowk, Nagpur, Maharashtra 440017', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Janki Theatre: Sitabuldi', 'Nagpur', 'Abhyankar Marg, Sitabuldi, near Maharashtra Bank, Nagpur, Maharashtra 440012', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Panchsheel Cinema: Nagpur', 'Nagpur', 'Panchsheel Square, New Ramdaspeth, Nagpur, Maharashtra 440012', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Cine Chourangi: Khapri', 'Khapri, Nagpur', 'Shankarpur Road, New Khapri, Nagpur, Maharashtra 441108', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Nagpur', 'Jayshree Cineplex: Nagpur', 'Nagpur', 'Subhash Road, Cotton Market, Ganeshpeth Colony, Nagpur, Maharashtra 440018', 'https://in.bookmyshow.com/nagpur/cinemas', NULL::integer, false, 'platform_listed_unverified')
)
SELECT
  district, venue_name, city, address, source_url,
  verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, city, venue_name;

-- If your actual schema is confirmed, a duplicate-check can be added against venues.
-- This file intentionally avoids guessing the production venues table column names.
