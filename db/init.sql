--
-- PostgreSQL database dump
--

\restrict iasnQMfUDvuAQhA8ZQZmDimVBqofbCYD5bvDoG6esJbKcBRVXnuQLmviM7Txjbo

-- Dumped from database version 17.10 (Debian 17.10-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_keys (
    key_id integer NOT NULL,
    admin_id integer NOT NULL,
    admin_key character varying(11) NOT NULL,
    generated_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    used_by integer,
    used_at timestamp without time zone
);


ALTER TABLE public.admin_keys OWNER TO postgres;

--
-- Name: admin_keys_key_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_keys_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_keys_key_id_seq OWNER TO postgres;

--
-- Name: admin_keys_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_keys_key_id_seq OWNED BY public.admin_keys.key_id;


--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    admin_id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    keys character varying(12),
    key_code integer
);


ALTER TABLE public.admins OWNER TO postgres;

COPY public.admins (admin_id, username, password_hash, created_at, keys, key_code) FROM stdin;
1	admin	admin123	2026-06-27 04:17:04.920591	\N	\N
\.
--
-- Name: admins_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_admin_id_seq OWNER TO postgres;

--
-- Name: admins_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_admin_id_seq OWNED BY public.admins.admin_id;


--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blacklist (
    blacklist_id integer NOT NULL,
    reason_code smallint NOT NULL,
    remarks text,
    blacklisted_by integer,
    blacklisted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    emp_id character varying(10),
    CONSTRAINT blacklist_reason_code_check CHECK (((reason_code >= 1) AND (reason_code <= 4)))
);


ALTER TABLE public.blacklist OWNER TO postgres;

--
-- Name: blacklist_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blacklist_blacklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blacklist_blacklist_id_seq OWNER TO postgres;

--
-- Name: blacklist_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blacklist_blacklist_id_seq OWNED BY public.blacklist.blacklist_id;


--
-- Name: employee_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_embeddings (
    emp_id character varying(20) NOT NULL,
    embedding public.vector(512) NOT NULL
);


ALTER TABLE public.employee_embeddings OWNER TO postgres;

--
-- Name: pass_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pass_sessions (
    session_id integer NOT NULL,
    visitor_id integer NOT NULL,
    emp_id character varying NOT NULL,
    passed boolean NOT NULL,
    detected_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    printed_at timestamp without time zone
);


ALTER TABLE public.pass_sessions OWNER TO postgres;

--
-- Name: pass_sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pass_sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pass_sessions_session_id_seq OWNER TO postgres;

--
-- Name: pass_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pass_sessions_session_id_seq OWNED BY public.pass_sessions.session_id;


--
-- Name: security_officers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_officers (
    officer_id integer NOT NULL,
    name character varying(100) NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    admin_keys character varying(20)
);


ALTER TABLE public.security_officers OWNER TO postgres;

--
-- Name: security_officers_officer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_officers_officer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_officers_officer_id_seq OWNER TO postgres;

--
-- Name: security_officers_officer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_officers_officer_id_seq OWNED BY public.security_officers.officer_id;


--
-- Name: visitor_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitor_embeddings (
    visitor_id integer NOT NULL,
    embedding public.vector(512),
    photo_path text
);


ALTER TABLE public.visitor_embeddings OWNER TO postgres;

--
-- Name: visitors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitors (
    visitor_id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    address text,
    duration integer,
    check_in timestamp without time zone,
    check_out timestamp without time zone,
    aadhaar_number character varying(12),
    company_firm character varying(100),
    police_verification_no character varying(50),
    validity_from date,
    embedding public.vector(512),
    photo_path text,
    registered_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    gender character varying(15),
    category character varying(40),
    nationality character varying(100),
    validity_to date,
    department character varying(100),
    emp_id character varying(100),
    purpose character varying(100),
    phone character varying(12),
    edited_by character varying(30),
    edited_at timestamp without time zone,
    passed boolean
);


ALTER TABLE public.visitors OWNER TO postgres;

--
-- Name: visitors_visitor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.visitors_visitor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.visitors_visitor_id_seq OWNER TO postgres;

--
-- Name: visitors_visitor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.visitors_visitor_id_seq OWNED BY public.visitors.visitor_id;


--
-- Name: admin_keys key_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_keys ALTER COLUMN key_id SET DEFAULT nextval('public.admin_keys_key_id_seq'::regclass);


--
-- Name: admins admin_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins ALTER COLUMN admin_id SET DEFAULT nextval('public.admins_admin_id_seq'::regclass);


--
-- Name: blacklist blacklist_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist ALTER COLUMN blacklist_id SET DEFAULT nextval('public.blacklist_blacklist_id_seq'::regclass);


--
-- Name: pass_sessions session_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pass_sessions ALTER COLUMN session_id SET DEFAULT nextval('public.pass_sessions_session_id_seq'::regclass);


--
-- Name: security_officers officer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_officers ALTER COLUMN officer_id SET DEFAULT nextval('public.security_officers_officer_id_seq'::regclass);


--
-- Name: visitors visitor_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitors ALTER COLUMN visitor_id SET DEFAULT nextval('public.visitors_visitor_id_seq'::regclass);


--
-- Name: admin_keys admin_keys_admin_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_keys
    ADD CONSTRAINT admin_keys_admin_key_key UNIQUE (admin_key);


--
-- Name: admin_keys admin_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_keys
    ADD CONSTRAINT admin_keys_pkey PRIMARY KEY (key_id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (admin_id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: blacklist blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_pkey PRIMARY KEY (blacklist_id);


--
-- Name: employee_embeddings employee_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_embeddings
    ADD CONSTRAINT employee_embeddings_pkey PRIMARY KEY (emp_id);


--
-- Name: pass_sessions pass_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pass_sessions
    ADD CONSTRAINT pass_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: security_officers security_officers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_officers
    ADD CONSTRAINT security_officers_pkey PRIMARY KEY (officer_id);


--
-- Name: security_officers security_officers_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_officers
    ADD CONSTRAINT security_officers_username_key UNIQUE (username);


--
-- Name: visitor_embeddings visitor_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitor_embeddings
    ADD CONSTRAINT visitor_embeddings_pkey PRIMARY KEY (visitor_id);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (visitor_id);


--
-- Name: employee_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX employee_embedding_idx ON public.employee_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_aadhaar; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aadhaar ON public.visitors USING btree (aadhaar_number);


--
-- Name: idx_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company ON public.visitors USING btree (company_firm);


--
-- Name: idx_embedding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_embedding ON public.visitors USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: ix_pass_sessions_emp_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_pass_sessions_emp_id ON public.pass_sessions USING btree (emp_id);


--
-- Name: admin_keys admin_keys_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_keys
    ADD CONSTRAINT admin_keys_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id);


--
-- Name: admin_keys admin_keys_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_keys
    ADD CONSTRAINT admin_keys_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.security_officers(officer_id);


--
-- Name: blacklist blacklist_blacklisted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_blacklisted_by_fkey FOREIGN KEY (blacklisted_by) REFERENCES public.security_officers(officer_id);


--
-- Name: pass_sessions pass_sessions_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pass_sessions
    ADD CONSTRAINT pass_sessions_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES public.visitors(visitor_id);


--
-- Name: visitors visitors_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.security_officers(officer_id);


--
-- PostgreSQL database dump complete
--

\unrestrict iasnQMfUDvuAQhA8ZQZmDimVBqofbCYD5bvDoG6esJbKcBRVXnuQLmviM7Txjbo

