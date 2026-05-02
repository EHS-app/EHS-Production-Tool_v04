--
-- PostgreSQL database dump
--

\restrict Mr0YhyjqeoHcJ3WnoAOEDQemzGohzHcEndQ62BUFSBmUeD2qaEpctTYvLatH2go

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: brief_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brief_assignments (
    id text NOT NULL,
    brief_id text NOT NULL,
    freelancer_user_id text NOT NULL,
    crew_id text DEFAULT ''::text NOT NULL,
    decision text DEFAULT 'pending'::text NOT NULL,
    decided_at timestamp with time zone,
    accepted_snapshot jsonb,
    accepted_gig_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brief_room_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brief_room_assignments (
    brief_id text NOT NULL,
    freelancer_user_id text NOT NULL,
    room_key text NOT NULL,
    locked boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: freelancer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelancer_profiles (
    user_id text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    primary_role text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    bio text DEFAULT ''::text NOT NULL,
    insurance text DEFAULT ''::text NOT NULL,
    dietary text DEFAULT ''::text NOT NULL,
    bank_account text DEFAULT ''::text NOT NULL,
    org_number text DEFAULT ''::text NOT NULL,
    languages text[] DEFAULT '{}'::text[] NOT NULL,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    allergies text DEFAULT ''::text NOT NULL,
    work_types text[] DEFAULT '{}'::text[] NOT NULL,
    consoles text[] DEFAULT '{}'::text[] NOT NULL,
    certs text[] DEFAULT '{}'::text[] NOT NULL,
    room_share text DEFAULT 'either'::text NOT NULL,
    gender text DEFAULT ''::text NOT NULL
);


--
-- Name: gigs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gigs (
    id text NOT NULL,
    freelancer_user_id text NOT NULL,
    brief_id text,
    project_name text DEFAULT ''::text NOT NULL,
    client text DEFAULT ''::text NOT NULL,
    venue text DEFAULT ''::text NOT NULL,
    role text DEFAULT ''::text NOT NULL,
    start_date date,
    end_date date,
    hours numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    rate numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    flat_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    check_in jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_dates date[] DEFAULT '{}'::date[] NOT NULL,
    hotel_required boolean DEFAULT false NOT NULL,
    check_in_date date,
    check_out_date date
);


--
-- Name: project_briefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_briefs (
    id text NOT NULL,
    owner_user_id text NOT NULL,
    project_name text DEFAULT ''::text NOT NULL,
    client text DEFAULT ''::text NOT NULL,
    venue text DEFAULT ''::text NOT NULL,
    start_date date,
    end_date date,
    data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: venue_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_memory (
    id integer NOT NULL,
    user_id text NOT NULL,
    venue_name text NOT NULL,
    venue_key text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: venue_memory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.venue_memory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: venue_memory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.venue_memory_id_seq OWNED BY public.venue_memory.id;


--
-- Name: venue_memory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_memory ALTER COLUMN id SET DEFAULT nextval('public.venue_memory_id_seq'::regclass);


--
-- Data for Name: brief_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brief_assignments (id, brief_id, freelancer_user_id, crew_id, decision, decided_at, accepted_snapshot, accepted_gig_id, created_at, updated_at) FROM stdin;
869525de-abe0-4c6e-b554-c3ef06dd7cf3	a44275a4-9228-4fef-b1cf-66a3241c8209	seed-3XC9QRoB	crew-62401c1c-b11f-4c61-8a0f-8d36ee08a12c	pending	\N	\N	\N	2026-04-30 19:30:38.109612+00	2026-04-30 19:30:38.109612+00
\.


--
-- Data for Name: brief_room_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brief_room_assignments (brief_id, freelancer_user_id, room_key, locked, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: freelancer_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.freelancer_profiles (user_id, full_name, phone, primary_role, city, bio, insurance, dietary, bank_account, org_number, languages, skills, created_at, updated_at, email, allergies, work_types, consoles, certs, room_share, gender) FROM stdin;
seed-3XC9QRoB	Sidebar Tester One		Lyd FOH	Oslo						{Norsk,English}	{"Lyd FOH","DiGiCo SD","Forklift G4 (NO)"}	2026-04-30 00:40:10.816369+00	2026-04-30 00:40:10.816369+00			{}	{}	{}	either	
\.


--
-- Data for Name: gigs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gigs (id, freelancer_user_id, brief_id, project_name, client, venue, role, start_date, end_date, hours, rate, flat_fee, notes, status, check_in, created_at, updated_at, assigned_dates, hotel_required, check_in_date, check_out_date) FROM stdin;
\.


--
-- Data for Name: project_briefs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_briefs (id, owner_user_id, project_name, client, venue, start_date, end_date, data, created_at, updated_at) FROM stdin;
brief_Ownt3zjb	user_3Cx5qiY52TcaJowheSkwll49BRQ	Hotel Slice A Test AQyv	Test Client	Test Hall	2026-04-30	2026-05-02	{}	2026-04-30 19:09:50.371331+00	2026-04-30 19:10:13.605119+00
a44275a4-9228-4fef-b1cf-66a3241c8209	user_3Cx5qiY52TcaJowheSkwll49BRQ				2026-04-27	\N	{"led": {"screens": [{"id": "led-9qg749j", "cols": 5, "name": "IMAG", "rows": 3, "brackets": [{"name": "(set bracket on inventory)", "count": 15}], "panelType": "Uniview UR Pro 0.5x1m (10.8kg)", "powerCables": 14, "totalPanels": 15, "powerLengthM": 8.4, "signalCables": 14, "signalLengthM": 18.2, "estimatedWatts": 5250, "processorPixels": 491520, "processorOutputs": 0, "processorMaxPixels": 0}], "processor": "", "screenCount": 1, "totalPanels": 15}, "sound": {"rowCount": 0, "totalQty": 0, "byCategory": [], "totalPower": 0, "totalWeight": 0}, "stage": {"stages": [], "totalArea": 0, "stageCount": 0, "totalLoadCapacityKg": 0}, "briefId": "0db639ad2eac", "project": {"date": "2026-04-27", "venue": "", "client": "", "schedule": {"show": [{"to": "2026-04-27", "from": "2026-04-27"}]}, "preparedBy": ""}, "rigging": {"systems": [{"id": "sys-1-jhiy45", "name": "LX1", "hoist": "EXE Rise D8+ 500kg (38.5kg | 0.8kW)", "pointCount": 3, "ledRowCount": 0, "dynamicFactor": 1.25, "fixtureRowCount": 0, "riggingRowCount": 1}], "hoistCount": 3, "systemCount": 1, "totalMotorW": 2400}, "version": 1, "lighting": {"distros": [], "universes": [], "distroCount": 0, "circuitCount": 0, "fixtureCount": 0, "totalDistroW": 0, "totalCircuitW": 0, "worstCircuitPct": 0, "totalFixtureWatts": 0, "worstDistroFeederPct": 0}, "riggPlan": {"venue": {"depthM": 12, "widthM": 20, "ceilingM": 8}, "trusses": [{"x": 10, "y": 6, "z": 7.5, "x1": 7, "x2": 13, "y1": 6, "y2": 6, "lengthM": 6, "rotation": 0, "systemId": "sys-1-jhiy45", "systemName": "LX1"}]}, "assignments": [{"name": "Sidebar Tester One", "role": "Sound", "hours": 10, "notes": "", "crewId": "crew-62401c1c-b11f-4c61-8a0f-8d36ee08a12c", "dayRate": 0, "offTime": "18:00", "callTime": "08:00", "freelancerUserId": "seed-3XC9QRoB"}], "attachments": [], "generatedAt": 1777577437998, "recipientCrewId": null}	2026-04-30 19:30:38.109612+00	2026-04-30 19:30:38.109612+00
brief_18XFoRT2	user_3Cx5qiY52TcaJowheSkwll49BRQ	Pair Test mwsT		Test Venue	2026-05-10	2026-05-15	{}	2026-04-30 19:46:07.790396+00	2026-04-30 19:46:07.790396+00
\.


--
-- Data for Name: venue_memory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.venue_memory (id, user_id, venue_name, venue_key, data, created_at, updated_at) FROM stdin;
\.


--
-- Name: venue_memory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.venue_memory_id_seq', 1, false);


--
-- Name: brief_assignments brief_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_assignments
    ADD CONSTRAINT brief_assignments_pkey PRIMARY KEY (id);


--
-- Name: brief_room_assignments brief_room_assignments_brief_id_freelancer_user_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_room_assignments
    ADD CONSTRAINT brief_room_assignments_brief_id_freelancer_user_id_pk PRIMARY KEY (brief_id, freelancer_user_id);


--
-- Name: freelancer_profiles freelancer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_profiles
    ADD CONSTRAINT freelancer_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: gigs gigs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gigs
    ADD CONSTRAINT gigs_pkey PRIMARY KEY (id);


--
-- Name: project_briefs project_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_briefs
    ADD CONSTRAINT project_briefs_pkey PRIMARY KEY (id);


--
-- Name: venue_memory venue_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_memory
    ADD CONSTRAINT venue_memory_pkey PRIMARY KEY (id);


--
-- Name: brief_assignments_brief_freelancer_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX brief_assignments_brief_freelancer_unique ON public.brief_assignments USING btree (brief_id, freelancer_user_id);


--
-- Name: brief_assignments_brief_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brief_assignments_brief_idx ON public.brief_assignments USING btree (brief_id);


--
-- Name: brief_assignments_freelancer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brief_assignments_freelancer_idx ON public.brief_assignments USING btree (freelancer_user_id);


--
-- Name: gigs_brief_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gigs_brief_idx ON public.gigs USING btree (brief_id);


--
-- Name: gigs_freelancer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gigs_freelancer_idx ON public.gigs USING btree (freelancer_user_id);


--
-- Name: project_briefs_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_briefs_owner_idx ON public.project_briefs USING btree (owner_user_id);


--
-- Name: venue_memory_user_venue_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX venue_memory_user_venue_key ON public.venue_memory USING btree (user_id, venue_key);


--
-- Name: brief_assignments brief_assignments_brief_id_project_briefs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_assignments
    ADD CONSTRAINT brief_assignments_brief_id_project_briefs_id_fk FOREIGN KEY (brief_id) REFERENCES public.project_briefs(id) ON DELETE CASCADE;


--
-- Name: brief_room_assignments brief_room_assignments_brief_id_project_briefs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_room_assignments
    ADD CONSTRAINT brief_room_assignments_brief_id_project_briefs_id_fk FOREIGN KEY (brief_id) REFERENCES public.project_briefs(id) ON DELETE CASCADE;


--
-- Name: gigs gigs_brief_id_project_briefs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gigs
    ADD CONSTRAINT gigs_brief_id_project_briefs_id_fk FOREIGN KEY (brief_id) REFERENCES public.project_briefs(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Mr0YhyjqeoHcJ3WnoAOEDQemzGohzHcEndQ62BUFSBmUeD2qaEpctTYvLatH2go

