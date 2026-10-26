-- MahaTicket venue candidates: districts 26-30 (alphabetical)
-- Read-only candidate preview. No INSERT, UPDATE, or DELETE.
-- Current listings are discovery evidence only; they do not prove operating status, capacity, seat map, or ticket-sale authorization.
-- Pune-region listings may include Pimpri-Chinchwad/Hinjawadi; verify municipal district mapping before import.
-- Raigad listings may include Kharghar/Neral; verify current administrative district and operating status.
-- Ratnagiri has limited independently supported results in this pass; do not treat this as an exhaustive district inventory.

WITH candidate_venues (
 district, venue_name, city, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Pune', 'INOX Megaplex: Phoenix Mall of the Millennium', 'Pune', 'Phoenix Mall of the Millennium, Wakad, Pune, Maharashtra 411057', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'PVR: Phoenix Market City', 'Pune', 'Phoenix Market City, Nagar Road, Viman Nagar, Pune, Maharashtra 411014', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'Cinepolis: Seasons Mall', 'Pune', 'Seasons Mall, Magarpatta City, Hadapsar, Pune, Maharashtra 411028', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'E-SQUARE: Xion Mall', 'Hinjawadi, Pune', 'Xion Mall, Hinjawadi Road, Pune, Maharashtra 411057', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'City Pride: Kothrud', 'Pune', 'Survey No. 20/1,2, Kothrud, Pune, Maharashtra 411038', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'Cinepolis: Nexus WESTEND Mall', 'Aundh, Pune', 'Nexus WESTEND Mall, Gurukul Park Road, Aundh, Pune, Maharashtra 411007', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'INOX: Elpro City Square', 'Pimpri-Chinchwad, Pune', 'Elpro City Square Mall, Pimpri Chinchwad Link Road, Pune, Maharashtra 411033', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'City Pride: Nyati Plaza', 'Kharadi, Pune', 'Nyati Plaza, Thite Nagar, Kharadi, Pune, Maharashtra 411014', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'PVR ICON: The Pavillion', 'Pune', 'The Pavillion Mall, Senapati Bapat Road, Shivajinagar, Pune, Maharashtra 411016', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'MovieMax: Amanora Town Centre', 'Pune', 'Amanora Town Centre, Hadapsar, Pune, Maharashtra 411028', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'Abhiruchi City Pride', 'Pune', 'Sinhagad Road, Vadgaon Budruk, Pune, Maharashtra 411041', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'PVR: Grand Highstreet Mall', 'Hinjawadi, Pune', 'Grand Highstreet Mall, Hinjawadi, Pune, Maharashtra 411057', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'Vishal Cinemaas', 'Pimpri-Chinchwad, Pune', 'Old Pune-Mumbai Highway, Pimpri, Pune, Maharashtra 411018', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'City Pride: Mangala Cinema', 'Pune', '111, Shivaji Road, Shivajinagar, Pune, Maharashtra 411005', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Pune', 'Rahul 70 MM', 'Pune', 'Ganeshkhind Road, Shivajinagar, Pune, Maharashtra 411004', 'https://in.bookmyshow.com/turn0search0', NULL::integer, false, 'platform_listed_unverified'),
  ('Raigad', 'Gold Cinema Khopoli', 'Khopoli, Raigad', 'Yashwant Tower, Old Mumbai-Pune Highway, Khopoli, Maharashtra 410203', 'https://cinematimes.in/turn1search7', NULL::integer, false, 'platform_listed_unverified'),
  ('Raigad', 'BMX Cinemas (Balaji Movieplex) Littleworld Kharghar', 'Kharghar, Raigad', 'Plot No. 21, Little World Mall, Sector 2, Kharghar, Maharashtra 410210', 'https://cinematimes.in/turn1search15', NULL::integer, false, 'platform_listed_unverified'),
  ('Raigad', 'Moreshwar Chitramandir', 'Pen, Raigad', 'M.G. Road, near S.T. Bus Depot and L.I.C. Office, Pen, Maharashtra 402107', 'https://cinematimes.in/turn1search5', NULL::integer, false, 'platform_listed_unverified'),
  ('Raigad', 'Gandhi Cinema', 'Mahad, Raigad', 'Mahad, Maharashtra 402301', 'https://cinematimes.in/turn1search7', NULL::integer, false, 'platform_listed_unverified'),
  ('Raigad', 'BVM Multiplex', 'Alibag, Raigad', 'Near Bank of Baroda, Prabhakar Patil Nagar, PNP Nagar, Alibag, Maharashtra 402201', 'https://cinematimes.in/turn1search7', NULL::integer, false, 'platform_listed_unverified'),
  ('Raigad', 'Mahesh Chitra Mandir Cinema', 'Neral, Raigad', 'Neral-Matheran Road, Diksal, Maharashtra 410101', 'https://cinematimes.in/turn1search7', NULL::integer, false, 'platform_listed_unverified'),
  ('Ratnagiri', 'City Pride: Annand Khed', 'Khed, Ratnagiri', 'Khed, Ratnagiri district, Maharashtra', 'https://cinematimes.in/turn1search4', NULL::integer, false, 'platform_listed_unverified'),
  ('Ratnagiri', 'City Pride Swaroop', 'Ratnagiri', 'Ratnagiri, Maharashtra', 'https://cinematimes.in/turn1search8', NULL::integer, false, 'platform_listed_unverified'),
  ('Sangli', 'Miraj Cinemas: Neww Pride', 'Sangli', '117/2A, New Pride Multiplex, behind Circuit House, Madhavnagar Road, Sangli, Maharashtra 416416', 'https://in.bookmyshow.com/turn0search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Sangli', 'Aurum Cinemas: Centre 1 Mall', 'Sangli', 'Centre 1 Mall, Sangli, Maharashtra', 'https://cinematimes.in/turn1search8', NULL::integer, false, 'platform_listed_unverified'),
  ('Sangli', 'Mankeshwar Theatre', 'Islampur, Sangli', 'Islampur, Sangli district, Maharashtra', 'https://cinematimes.in/turn1search8', NULL::integer, false, 'platform_listed_unverified'),
  ('Sangli', 'Citypride Swaroop', 'Sangli', 'Sangli, Maharashtra', 'https://cinematimes.in/turn1search8', NULL::integer, false, 'platform_listed_unverified'),
  ('Sangli', 'Zele Cinema', 'Jaysingpur, Sangli district', 'Jaysingpur, Maharashtra', 'https://in.bookmyshow.com/turn0search9', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Rajlaxmi Talkies', 'Satara', 'Rajpath, Bhavani Peth, Satara, Maharashtra 415002', 'https://cinematimes.in/turn1search1', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', '7 Star Cinema', 'Satara', 'Satara, Maharashtra', 'https://cinematimes.in/turn1search10', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Cinea City Pride', 'Phaltan, Satara', 'Gajanan Chowk, Ravivar Peth, Phaltan, Maharashtra 415523', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'New Chitra Cinema', 'Wai, Satara', 'Chota Pul, Gangapuri Road, Wai, Maharashtra 412803', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Digvijay Chitra Mandir', 'Rahimatpur, Satara', 'Rahimatpur-Satara Road, Rahimatpur, Maharashtra 415004', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Prabhat Cinema', 'Rahimatpur, Satara', 'Bazaar Peth, Rahimatpur, Maharashtra 415511', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Anup Cinema', 'Vaduj, Satara', 'Vaduj, Maharashtra 415506', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Azad Cinema', 'Shirwal, Satara', 'NH 4, Shirwal, Satara district, Maharashtra 412801', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified'),
  ('Satara', 'Prabhat Cinema', 'Karad, Satara', 'Near Nagar Palika Building, Raviwar Peth, Karad, Maharashtra 415110', 'https://cinematimes.in/turn1search3', NULL::integer, false, 'platform_listed_unverified')
)
SELECT district, venue_name, city, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, city, venue_name;
