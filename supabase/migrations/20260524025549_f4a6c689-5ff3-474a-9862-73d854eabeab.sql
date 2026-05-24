
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  passcode text not null,
  created_at timestamptz default now()
);

create table public.tasks (
  id text primary key,
  type text not null,
  order_num int not null,
  icon text,
  title text not null,
  subtitle text,
  clue text,
  task_description text not null,
  hint text,
  map_url text,
  base_points int not null,
  bonus_description text,
  max_bonus_points int default 0
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  task_id text not null references public.tasks(id),
  photo_url text,
  notes text,
  bonus_claimed boolean default false,
  awarded_points int,
  submitted_at timestamptz default now(),
  unique (team_id, task_id)
);

create table public.dolly_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  line_num int not null,
  answer_text text not null,
  is_correct boolean
);

alter table public.teams enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.dolly_answers enable row level security;

create policy "public all teams" on public.teams for all using (true) with check (true);
create policy "public read tasks" on public.tasks for select using (true);
create policy "public all submissions" on public.submissions for all using (true) with check (true);
create policy "public all dolly" on public.dolly_answers for all using (true) with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('submission-photos', 'submission-photos', true)
on conflict (id) do nothing;

create policy "public read photos" on storage.objects for select using (bucket_id = 'submission-photos');
create policy "public upload photos" on storage.objects for insert with check (bucket_id = 'submission-photos');
create policy "public update photos" on storage.objects for update using (bucket_id = 'submission-photos');

-- Seed tasks
insert into public.tasks (id, type, order_num, icon, title, subtitle, clue, task_description, hint, map_url, base_points, bonus_description, max_bonus_points) values
('stop-01','stop',1,'⚡','The Old Power Plant','707 W Cesar Chavez St','I once powered an entire city with steam and fire, now I stand as a monument to time. Find the historic water intake structure along the lakeshore — where concrete meets the Colorado.','Snap a photo standing next to the old intake facility. Bonus points if you can find any original signage still attached to the structure.','Head toward Lady Bird Lake along Cesar Chavez. Look for the large industrial concrete structure right at the water''s edge.','https://maps.google.com/?q=Seaholm+Water+Intake+Facility+Austin+TX',100,'Find any original signage still attached to the structure for bonus points.',25),
('stop-02','stop',2,'🌿','Seaholm Plaza','211 Power Plant Dr','The heart of the district beats here — a modern gathering ground built where smokestacks once rose. Sit where families picnic and dogs roam free.','Find the center of the plaza and count the number of benches visible from that spot. Write it down — you''ll need it for the tiebreaker!','Look for the open paved area near Trader Joe''s and the Seaholm Energy Center. There''s often live music on weekends.','https://maps.google.com/?q=Seaholm+Plaza+Austin+TX',75,null,0),
('stop-03','stop',3,'📚','The Library at Seaholm','Austin Public Library, 710 W César Chávez St','Six floors of stories stand watch over the district. A green roof garden sits above a quarter-million books. Find the city''s greatest gift to curious minds.','Locate the rooftop garden entrance and find the view of Lady Bird Lake. What landmark can you see across the water? Write it down.','The Austin Central Library is that gorgeous modern building with the living green roof. Elevators go all the way to the top.','https://maps.google.com/?q=Austin+Central+Library+710+W+Cesar+Chavez',75,null,0),
('stop-04','stop',4,'🏚️','The Old Warehouse','End of W 3rd St · Behind the Amtrak Station','At the dead end of 3rd Street, past the hiss of train brakes and the shadow of the Amtrak platform, a forgotten warehouse stands — paint-peeled, sun-baked, and full of stories the neighborhood hasn''t told yet.','Find the old warehouse structure behind the Amtrak station at the end of W 3rd St. Photograph the most interesting detail you can find — a rusted door, faded lettering, crumbling brick, or a weathered window. What do you think this building used to be?','Walk to the far end of W 3rd St heading west past the train tracks. The warehouse sits tucked behind or alongside the Amtrak station area — look for old brick or corrugated metal.','https://maps.google.com/?q=W+3rd+St+Austin+TX+near+Amtrak+station',200,null,0),
('stop-05','stop',5,'🚂','The Picnic Table by the Tracks','Railroad corridor · Seaholm District','Steel rails still cut through this neighborhood like a scar from its industrial past. Somewhere beside those tracks, a lone table sits — a quiet place to eat while the city hums around you.','Find the picnic table nearest the railroad tracks in the Seaholm area. Sit down for at least 60 seconds. If a train passes while you''re there, that''s worth 25 bonus points — photograph it!','Look along the active railroad corridor that runs through the Seaholm neighborhood, roughly parallel to W 3rd St.','https://maps.google.com/?q=railroad+tracks+Seaholm+District+Austin+TX',100,'A train passes while you''re there — photograph it for 25 bonus pts!',25),
('stop-06','stop',6,'💀','Sugar Skull at Republic Square','422 Guadalupe St · Republic Square Park','In a park where farmers gather on weekends and oak trees cast long shadows, a decorated skull stares back at you — vivid, joyful, and a little bit eerie. Find this Día de los Muertos-inspired artwork and pay your respects.','Hunt down every sugar skull you can find in and around Republic Square Park. Photograph your entire team with EACH one — every skull with a full team photo earns 50 bonus points on top of the base score. Miss even one team member in a photo and that skull doesn''t count.','Republic Square Park is at Guadalupe St and W 4th St, a short walk east from the Seaholm core.','https://maps.google.com/?q=Republic+Square+Park+422+Guadalupe+St+Austin+TX',200,'Every additional sugar skull with the full team photographed = 50 bonus pts.',50),
('stop-07','stop',7,'🅰️','The ATX Sign','Near Whole Foods · Lamar Blvd','Three bold letters declare the name of this city to anyone who will look. Colorful, proud, and deeply Instagrammable — this sign has welcomed a thousand visitors and sent them home smiling.','Get a team photo with everyone in frame and the ATX sign clearly visible. Bonus: convince a stranger to join the photo.','The ATX Sign is just outside Whole Foods Market on Lamar Blvd, a short walk or ride from the Seaholm core.','https://maps.google.com/?q=ATX+Sign+Austin+Texas',100,'Convince a stranger to join the team photo.',25),
('stop-08','stop',8,'🦉','The Owl at The Proper','Austin Proper Hotel · 600 W 2nd St','Standing watch outside one of Austin''s sleekest hotels, a wise and weathered owl peers out over the street — part guardian, part art piece, all attitude. Find the bird and see what it sees.','Locate the owl sculpture at the entrance of The Proper Hotel. Get a photo with every team member posed alongside it. Best owl face wins.','The Austin Proper Hotel is on W 2nd St near Bowie St, just a short walk from the Seaholm District core.','https://maps.google.com/?q=Austin+Proper+Hotel+600+W+2nd+St+Austin+TX',150,'Award 25 bonus pts to the best owl face among teammates.',25),
('stop-09','stop',9,'🏛️','Odom Pavilion','Republic Square Park · Guadalupe & W 4th St','Named for a beloved Austin parks champion, this open-air pavilion anchors one of downtown''s most storied green spaces. It''s hosted farmers markets, concerts, rallies, and lazy Sunday afternoons — find it and add yours to the list.','Stand at the center of Odom Pavilion and do something memorable — strike a group pose, belt out a lyric, do a runway walk across it. Record a 15-second video.','Odom Pavilion is inside Republic Square Park at the corner of Guadalupe St and W 4th St.','https://maps.google.com/?q=Odom+Pavilion+Republic+Square+Park+Austin+TX',125,'Get a stranger to stop and watch (+25 pts).',25),
('stop-10','stop',10,'🌉','Pfluger Pedestrian Bridge','222 West Ave · Lady Bird Lake','Stretching wide over Lady Bird Lake, this beloved bridge connects two sides of the city with nothing but open sky, still water, and the Austin skyline for company. Joggers, cyclists, and dreamers all pass through — now it''s your turn.','Get every team member to the midpoint of the bridge and take a group selfie with the Austin skyline behind you — everyone in frame, no exceptions. Then shoot a panoramic photo with the lake stretching out on both sides.','The Pfluger Pedestrian Bridge runs across Lady Bird Lake off West Ave, just south of the Seaholm District.','https://maps.google.com/?cid=5800870899870450034',150,'Spot bats at dusk, a kayaker, or a paddleboarder on the water (+25 pts).',25),
('challenge-bangs','challenge',11,'✂️','Street Bangs','Find a willing stranger · anywhere on the route',null,'Stop a stranger on the street and ask if they''ll let you trim or style their bangs right then and there. You are the professional — own it. Document with a before AND after photo side by side.',null,null,300,'Stranger says "oh wow I love it" on camera (+50 pts).',50),
('challenge-braid','challenge',12,'🪢','Sidewalk Braid','Find a willing stranger · anywhere on the route',null,'Ask a stranger to sit still while you give them a braid right on the sidewalk. Any braid counts. Finish with a spritz of KMS Hairplay Makeover Spray to lock it in. Photo of finished braid with the KMS can visible and the stranger giving a thumbs up.',null,null,250,'They ask you for your business card after (+25 pts).',25),
('challenge-ponytail','challenge',13,'🎀','The Street Slick-Back','Find a willing stranger · anywhere on the route',null,'Hunt down a stranger and give them a slick-back ponytail right on the street. Use the Oribe Super Shine Stick to swipe over every flyaway. Record a 10-second video showing you finishing with the Oribe stick.',null,null,250,'Stranger says it''s the best ponytail they''ve ever had (+25 pts).',25),
('challenge-dolly','challenge',14,'🎵','Dolly Parton: 9 to 5','Complete the missing lyrics — no Googling!',null,'Fill in the missing lines from "9 to 5" by Dolly Parton. Five lyric prompts. Scored automatically — 20 pts per correct line.',null,null,100,null,0);
