#  AnteaterEvents
# Check it out here: https://anteater-events.onrender.com/

##  Inspiration
UCI students have a reputation for being antisocial and not going out much. While that might be true for some of us introverts, a big part of the issue is simply **not knowing what’s happening on campus**.  

Existing tools like Zotspot make it inconvenient to find events — the search features are limited, and unless you already know the campus well, it can be confusing to locate events. On top of that, club events are often scattered across various social media pages.  

We figured it should be **way easier** than that. So, we decided to bring everything together in one place.

---

##  What It Does
**AnteaterEvents** lets users open an app and instantly see everything happening on campus through an **interactive map**.  
- Tap on a marker to view event details.  
- Create your own events by selecting a point on the map and filling in the info.  
- Filter events by **date, category, title, or description**.  
- Plan ahead by browsing events a week or month in advance.  
- Use **Gemini AI search** to find events tailored to your exact interests.  


---

##  How We Built It
- **Backend:** [Django](https://www.djangoproject.com/)  
- **Frontend:** [React](https://reactjs.org/)  
- **Database:** [Supabase](https://supabase.com/)  
- **AI Search:** [Google Gemini API](https://ai.google.dev/)  
- **Containerization:** [Docker](https://www.docker.com/)  
- **Deployment:** [Render](https://render.com/) for both frontend and backend  

---

##  Challenges We Ran Into
We faced quite a few hurdles along the way:  
- Initially tried **Firebase**, but realized it functioned more as a backend-as-a-service, limiting flexibility.  
- Integrating **Gemini AI** caused memory issues on our free-tier Render instance — forcing us to **optimize our Docker container** and reduce memory usage.  
- Connecting the frontend to the backend was a learning curve since most of us had previously only *used* APIs, not *built* them in a full-stack setup.

---

##  Accomplishments We’re Proud Of
- Deployed a **fully functional RESTful API** that works beyond localhost.  
- Successfully **containerized the backend with Docker** and ran it in a production environment.  
- Built a **user-friendly React frontend** that’s visually appealing and intuitive.  
- Developed a **full-stack app** with persistent storage, live deployment, and AI-powered event search.  
- Created a tool that genuinely solves a problem we personally experienced as UCI students.

---

##  What We Learned
- How frontend and backend systems communicate and how to design APIs effectively.  
- Designing apps with **clear functional requirements**.  
- Configuring databases and integrating external APIs and libraries.  
- Deploying full-stack apps across both frontend and backend environments.  
- Creating a **user friendly interface** that prioritizes ease of navigation and experience.

---

##  What’s Next for AnteaterEvents
If AnteaterEvents is well-received, we plan to:
- Expand it for **wider public use** beyond UCI.  
- Add **real-time event updates** and **user authentication**.  
- Integrate with **UCI club systems** and possibly even student calendars.  





