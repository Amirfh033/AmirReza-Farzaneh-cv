(function(){
  "use strict";

  var STORAGE_KEY = "arf_site_data_v1";
  var PASS_KEY = "arf_site_password_v1";
  var SESSION_FLAG = "arf_admin_unlocked";
  var DEFAULT_PASSWORD = "amirreza";
  var GH_CONFIG_KEY = "arf_github_sync_v1";
  var GH_DATA_PATH = "assets/data.js";
  var GH_AUTOSYNC_DELAY = 3000;

  var state = loadState();
  var adminMode = sessionStorage.getItem(SESSION_FLAG) === "1";

  /* ---------------------------------------------------------
     Storage
     --------------------------------------------------------- */
  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ /* fall through to default */ }
    return JSON.parse(JSON.stringify(window.SITE_DEFAULT_DATA));
  }

  function persist(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){
      showToast("Could not save — storage may be full");
    }
    scheduleAutoSync();
  }

  function getPassword(){
    return localStorage.getItem(PASS_KEY) || DEFAULT_PASSWORD;
  }

  /* ---------------------------------------------------------
     Small utilities
     --------------------------------------------------------- */
  function escapeHtml(str){
    return String(str == null ? "" : str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function getPath(obj, path){
    var parts = path.split(".");
    var cur = obj;
    for(var i=0;i<parts.length;i++){ cur = cur[parts[i]]; if(cur === undefined) return ""; }
    return cur;
  }

  function setPath(obj, path, value){
    var parts = path.split(".");
    var cur = obj;
    for(var i=0;i<parts.length-1;i++){ cur = cur[parts[i]]; }
    cur[parts[parts.length-1]] = value;
  }

  var toastTimer = null;
  function showToast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 1800);
  }

  function el(html){
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  /* ---------------------------------------------------------
     Render: hero / about (static structure, dynamic content)
     --------------------------------------------------------- */
  function renderHero(){
    var p = state.profile;
    document.getElementById("heroName").textContent = p.name;
    document.getElementById("heroTitle").textContent = p.title;
    document.getElementById("heroTagline").textContent = p.tagline;
    document.getElementById("heroLocation").textContent = p.location;
    document.getElementById("heroPhone").textContent = p.phone;

    var emailEl = document.getElementById("heroEmail");
    emailEl.textContent = p.email;
    emailEl.href = "mailto:" + p.email;

    var ghEl = document.getElementById("heroGithub");
    ghEl.textContent = "github.com/" + p.github;
    ghEl.href = "https://github.com/" + p.github;

    document.getElementById("heroPhoto").src = p.photo;
    var webpSource = document.getElementById("heroPhotoWebp");
    if(p.photo.indexOf("data:") === 0){
      // custom uploaded photo — drop the default WebP source so the <img> (data URL) is used
      webpSource.removeAttribute("srcset");
    } else {
      webpSource.setAttribute("srcset", "assets/profile.webp");
    }

    document.title = p.name + " — Electrical Engineering";
    syncContactLinks();
  }

  function syncContactLinks(){
    var p = state.profile;
    var eBtn = document.getElementById("contactEmailBtn");
    var gBtn = document.getElementById("contactGithubBtn");
    eBtn.href = "mailto:" + p.email;
    gBtn.href = "https://github.com/" + p.github;
  }

  function renderAbout(){
    document.getElementById("aboutBody").textContent = state.about.body;
    var wrap = document.getElementById("aboutFacts");
    wrap.innerHTML = state.about.facts.map(function(f, i){
      return '<div class="fact">' +
        '<dt class="ed" data-bind="about.facts.'+i+'.label">'+escapeHtml(f.label)+'</dt>' +
        '<dd class="ed" data-bind="about.facts.'+i+'.value">'+escapeHtml(f.value)+'</dd>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: experience (timeline)
     --------------------------------------------------------- */
  function renderExperience(){
    var wrap = document.getElementById("experienceList");
    wrap.innerHTML = state.experience.map(function(x, i){
      return '<div class="timeline-item is-removable">' +
        '<button class="admin-remove" data-remove="experience" data-index="'+i+'" aria-label="Remove entry">×</button>' +
        '<div class="ti-dates">' +
          '<span class="ed" data-bind="experience.'+i+'.start">'+escapeHtml(x.start)+'</span> — ' +
          '<span class="ed" data-bind="experience.'+i+'.end">'+escapeHtml(x.end)+'</span>' +
        '</div>' +
        '<div class="ti-role ed" data-bind="experience.'+i+'.role">'+escapeHtml(x.role)+'</div>' +
        '<div class="ti-org ed" data-bind="experience.'+i+'.org">'+escapeHtml(x.org)+'</div>' +
        '<div class="ti-loc ed" data-bind="experience.'+i+'.location">'+escapeHtml(x.location)+'</div>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: education
     --------------------------------------------------------- */
  function renderEducation(){
    var wrap = document.getElementById("educationList");
    wrap.innerHTML = state.education.map(function(x, i){
      return '<div class="edu-card is-removable">' +
        '<button class="admin-remove" data-remove="education" data-index="'+i+'" aria-label="Remove entry">×</button>' +
        '<div class="edu-degree ed" data-bind="education.'+i+'.degree">'+escapeHtml(x.degree)+'</div>' +
        '<div class="edu-inst ed" data-bind="education.'+i+'.institution">'+escapeHtml(x.institution)+'</div>' +
        '<div class="edu-loc ed" data-bind="education.'+i+'.location">'+escapeHtml(x.location)+'</div>' +
        '<div class="edu-dates">' +
          '<span class="ed" data-bind="education.'+i+'.start">'+escapeHtml(x.start)+'</span> — ' +
          '<span class="ed" data-bind="education.'+i+'.end">'+escapeHtml(x.end)+'</span>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: skills
     --------------------------------------------------------- */
  function renderSkills(){
    var wrap = document.getElementById("skillsList");
    wrap.innerHTML = state.skills.map(function(cat, ci){
      var chips = cat.items.map(function(item, ii){
        return '<span class="chip">' +
          '<span class="ed" data-bind="skills.'+ci+'.items.'+ii+'">'+escapeHtml(item)+'</span>' +
          '<button class="chip-remove" data-removechip data-cat="'+ci+'" data-idx="'+ii+'" aria-label="Remove skill">×</button>' +
        '</span>';
      }).join("");
      return '<div class="skill-group is-removable">' +
        '<button class="admin-remove" data-remove="skills" data-index="'+ci+'" aria-label="Remove category">×</button>' +
        '<div class="skill-cat ed" data-bind="skills.'+ci+'.category">'+escapeHtml(cat.category)+'</div>' +
        '<div class="chip-row">' + chips +
          '<button class="admin-add-chip" data-addchip data-cat="'+ci+'">+ skill</button>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: grades
     --------------------------------------------------------- */
  function renderGrades(){
    var wrap = document.getElementById("gradesList");
    wrap.innerHTML = state.grades.map(function(g, i){
      return '<tr>' +
        '<td class="ed" data-bind="grades.'+i+'.course">'+escapeHtml(g.course)+'</td>' +
        '<td class="grade-val ed" data-bind="grades.'+i+'.grade">'+escapeHtml(g.grade)+'</td>' +
        '<td><button class="row-remove" data-remove="grades" data-index="'+i+'" aria-label="Remove row">×</button></td>' +
      '</tr>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: projects
     --------------------------------------------------------- */
  function renderProjects(){
    var wrap = document.getElementById("projectsList");
    wrap.innerHTML = state.projects.map(function(x, i){
      return '<div class="project-card is-removable">' +
        '<button class="admin-remove" data-remove="projects" data-index="'+i+'" aria-label="Remove project">×</button>' +
        '<span class="project-tag ed" data-bind="projects.'+i+'.tag">'+escapeHtml(x.tag)+'</span>' +
        '<div class="project-title ed" data-bind="projects.'+i+'.title">'+escapeHtml(x.title)+'</div>' +
        '<div class="project-note ed" data-bind="projects.'+i+'.note">'+escapeHtml(x.note)+'</div>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: research
     --------------------------------------------------------- */
  function renderResearch(){
    var wrap = document.getElementById("researchList");
    wrap.innerHTML = state.research.map(function(x, i){
      return '<div class="research-item is-removable">' +
        '<button class="admin-remove" data-remove="research" data-index="'+i+'" aria-label="Remove entry">×</button>' +
        '<div class="research-title ed" data-bind="research.'+i+'.title">'+escapeHtml(x.title)+'</div>' +
        '<div class="research-meta">' +
          '<span class="ed" data-bind="research.'+i+'.collaborators">'+escapeHtml(x.collaborators)+'</span>' +
          '<span class="status-pill ed" data-bind="research.'+i+'.status">'+escapeHtml(x.status)+'</span>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: certificates / honors / languages
     --------------------------------------------------------- */
  function renderCerts(){
    var wrap = document.getElementById("certList");
    wrap.innerHTML = state.certificates.map(function(x, i){
      return '<div class="cert-item is-removable">' +
        '<span class="cert-title ed" data-bind="certificates.'+i+'.title">'+escapeHtml(x.title)+'</span>' +
        '<span style="display:flex;align-items:center;">' +
          '<span class="cert-issuer ed" data-bind="certificates.'+i+'.issuer">'+escapeHtml(x.issuer)+'</span>' +
          '<button class="row-remove" data-remove="certificates" data-index="'+i+'" aria-label="Remove certificate">×</button>' +
        '</span>' +
      '</div>';
    }).join("");
  }

  function renderHonors(){
    var wrap = document.getElementById("honorsList");
    wrap.innerHTML = state.honors.map(function(x, i){
      return '<li class="is-removable" style="padding-right:1.4rem;">' +
        '<span class="ed" data-bind="honors.'+i+'">'+escapeHtml(x)+'</span>' +
        '<button class="row-remove" data-remove="honors" data-index="'+i+'" aria-label="Remove honor">×</button>' +
      '</li>';
    }).join("");
  }

  function renderLanguages(){
    var wrap = document.getElementById("langList");
    wrap.innerHTML = state.languages.map(function(x, i){
      return '<div class="lang-row is-removable">' +
        '<span class="lang-name ed" data-bind="languages.'+i+'.name">'+escapeHtml(x.name)+'</span>' +
        '<span class="lang-scores">' +
          'R <span class="ed" data-bind="languages.'+i+'.reading">'+escapeHtml(x.reading)+'</span> · ' +
          'W <span class="ed" data-bind="languages.'+i+'.writing">'+escapeHtml(x.writing)+'</span> · ' +
          'S <span class="ed" data-bind="languages.'+i+'.speaking">'+escapeHtml(x.speaking)+'</span> · ' +
          'L <span class="ed" data-bind="languages.'+i+'.listening">'+escapeHtml(x.listening)+'</span>' +
          '<button class="row-remove" data-remove="languages" data-index="'+i+'" aria-label="Remove language">×</button>' +
        '</span>' +
      '</div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render everything
     --------------------------------------------------------- */
  function renderAll(){
    renderHero();
    renderAbout();
    renderExperience();
    renderEducation();
    renderSkills();
    renderGrades();
    renderProjects();
    renderResearch();
    renderCerts();
    renderHonors();
    renderLanguages();
    applyEditableState();
  }

  function applyEditableState(){
    document.body.classList.toggle("admin-on", adminMode);
    var items = document.querySelectorAll(".ed");
    for(var i=0;i<items.length;i++){
      items[i].setAttribute("contenteditable", adminMode ? "true" : "false");
    }
  }

  /* ---------------------------------------------------------
     Editing: save on blur, delegated
     --------------------------------------------------------- */
  document.addEventListener("focusout", function(e){
    var t = e.target;
    if(!t.classList || !t.classList.contains("ed")) return;
    var path = t.getAttribute("data-bind");
    var value = t.textContent.replace(/\s+/g, " ").trim();

    if(path){
      setPath(state, path, value);
    } else if(t.id === "heroName"){ state.profile.name = value; }
    else if(t.id === "heroTitle"){ state.profile.title = value; }
    else if(t.id === "heroTagline"){ state.profile.tagline = value; }
    else if(t.id === "heroLocation"){ state.profile.location = value; }
    else if(t.id === "heroPhone"){ state.profile.phone = value; }
    else if(t.id === "heroEmail"){ state.profile.email = value; }
    else if(t.id === "heroGithub"){
      var v = value.replace(/^https?:\/\//,"").replace(/^github\.com\//,"").replace(/\/$/,"");
      state.profile.github = v || state.profile.github;
    } else if(t.id === "aboutBody"){ state.about.body = value; }

    if(t.id === "heroEmail" || t.id === "heroGithub"){
      renderHero(); // re-sync href + display text
      applyEditableState();
    }

    persist();
  }, true);

  /* ---------------------------------------------------------
     Add / remove handlers (delegated clicks)
     --------------------------------------------------------- */
  var BLANK = {
    experience: { role: "New role", org: "Organization", location: "City, Country", start: "Start", end: "Present" },
    education: { degree: "New degree", institution: "Institution", location: "City, Country", start: "Start", end: "End" },
    skills: { category: "New category", items: ["New skill"] },
    grades: { course: "New course", grade: "0.0" },
    projects: { title: "New project", tag: "Category", note: "Short description of the project." },
    research: { title: "New research title", collaborators: "Collaborators", status: "In progress" },
    certificates: { title: "New certificate", issuer: "Issuer" },
    honors: "New honor",
    languages: { name: "New language", reading: "-", writing: "-", speaking: "-", listening: "-" }
  };

  var RENDERERS = {
    experience: renderExperience,
    education: renderEducation,
    skills: renderSkills,
    grades: renderGrades,
    projects: renderProjects,
    research: renderResearch,
    certificates: renderCerts,
    honors: renderHonors,
    languages: renderLanguages
  };

  document.addEventListener("click", function(e){
    var addBtn = e.target.closest("[data-add]");
    if(addBtn && adminMode){
      var key = addBtn.getAttribute("data-add");
      var blank = BLANK[key];
      state[key].push(typeof blank === "object" ? JSON.parse(JSON.stringify(blank)) : blank);
      persist();
      RENDERERS[key]();
      applyEditableState();
      showToast("Added — click the new entry to edit it");
      return;
    }

    var removeBtn = e.target.closest("[data-remove]");
    if(removeBtn && adminMode){
      var rkey = removeBtn.getAttribute("data-remove");
      var idx = parseInt(removeBtn.getAttribute("data-index"), 10);
      if(confirm("Remove this entry?")){
        state[rkey].splice(idx, 1);
        persist();
        RENDERERS[rkey]();
        applyEditableState();
        showToast("Removed");
      }
      return;
    }

    var addChip = e.target.closest("[data-addchip]");
    if(addChip && adminMode){
      var ci = parseInt(addChip.getAttribute("data-cat"), 10);
      state.skills[ci].items.push("New skill");
      persist();
      renderSkills();
      applyEditableState();
      return;
    }

    var removeChip = e.target.closest("[data-removechip]");
    if(removeChip && adminMode){
      var cci = parseInt(removeChip.getAttribute("data-cat"), 10);
      var iidx = parseInt(removeChip.getAttribute("data-idx"), 10);
      state.skills[cci].items.splice(iidx, 1);
      persist();
      renderSkills();
      applyEditableState();
      return;
    }
  });

  /* ---------------------------------------------------------
     Admin: login / logout / password / reset / import-export
     --------------------------------------------------------- */
  var loginModal = document.getElementById("loginModal");
  var passwordModal = document.getElementById("passwordModal");

  function openModal(m){ m.classList.add("open"); }
  function closeModal(m){ m.classList.remove("open"); }

  document.getElementById("adminLink").addEventListener("click", function(){
    if(adminMode){
      showToast("Already in edit mode");
      return;
    }
    document.getElementById("loginError").classList.remove("show");
    document.getElementById("loginInput").value = "";
    openModal(loginModal);
    document.getElementById("loginInput").focus();
  });

  document.getElementById("loginCancel").addEventListener("click", function(){ closeModal(loginModal); });

  function attemptLogin(){
    var val = document.getElementById("loginInput").value;
    if(val === getPassword()){
      adminMode = true;
      sessionStorage.setItem(SESSION_FLAG, "1");
      closeModal(loginModal);
      applyEditableState();
      showToast("Edit mode on");
    } else {
      document.getElementById("loginError").classList.add("show");
    }
  }
  document.getElementById("loginSubmit").addEventListener("click", attemptLogin);
  document.getElementById("loginInput").addEventListener("keydown", function(e){
    if(e.key === "Enter") attemptLogin();
  });

  document.getElementById("btnExit").addEventListener("click", function(){
    adminMode = false;
    sessionStorage.removeItem(SESSION_FLAG);
    applyEditableState();
    showToast("Edit mode off");
  });

  document.getElementById("btnPassword").addEventListener("click", function(){
    document.getElementById("newPasswordInput").value = "";
    openModal(passwordModal);
    document.getElementById("newPasswordInput").focus();
  });
  document.getElementById("passwordCancel").addEventListener("click", function(){ closeModal(passwordModal); });
  document.getElementById("passwordSubmit").addEventListener("click", function(){
    var np = document.getElementById("newPasswordInput").value.trim();
    if(np.length < 3){ showToast("Use at least 3 characters"); return; }
    localStorage.setItem(PASS_KEY, np);
    closeModal(passwordModal);
    showToast("Password updated");
  });

  document.getElementById("btnReset").addEventListener("click", function(){
    if(confirm("Reset all content back to the original CV-based defaults? This cannot be undone.")){
      state = JSON.parse(JSON.stringify(window.SITE_DEFAULT_DATA));
      persist();
      renderAll();
      showToast("Content reset to defaults");
    }
  });

  document.getElementById("btnExport").addEventListener("click", function(){
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "site-content-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup downloaded");
  });

  var importInput = document.getElementById("importInput");
  document.getElementById("btnImport").addEventListener("click", function(){ importInput.click(); });
  importInput.addEventListener("change", function(){
    var file = importInput.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var parsed = JSON.parse(reader.result);
        if(!parsed.profile || !parsed.experience) throw new Error("bad shape");
        state = parsed;
        persist();
        renderAll();
        showToast("Backup imported");
      }catch(err){
        showToast("That file doesn't look like a valid backup");
      }
    };
    reader.readAsText(file);
    importInput.value = "";
  });

  /* ---------------------------------------------------------
     Photo upload
     --------------------------------------------------------- */
  document.getElementById("photoEditBtn").addEventListener("click", function(){
    document.getElementById("photoInput").click();
  });
  document.getElementById("photoInput").addEventListener("change", function(e){
    var file = e.target.files[0];
    if(!file) return;
    if(file.size > 4 * 1024 * 1024){
      showToast("Please choose an image under 4MB");
      return;
    }
    var reader = new FileReader();
    reader.onload = function(){
      state.profile.photo = reader.result;
      persist();
      document.getElementById("heroPhotoWebp").removeAttribute("srcset");
      document.getElementById("heroPhoto").src = reader.result;
      showToast("Photo updated");
    };
    reader.readAsDataURL(file);
  });

  /* ---------------------------------------------------------
     GitHub sync — push the current content straight to the repo
     --------------------------------------------------------- */
  function loadGhConfig(){
    try{
      var raw = localStorage.getItem(GH_CONFIG_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ /* fall through */ }
    return { owner: "", repo: "", branch: "main", token: "", autoSync: false, lastSync: null };
  }

  function saveGhConfig(cfg){
    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(cfg));
  }

  var ghConfig = loadGhConfig();
  var autoSyncTimer = null;

  function utf8ToBase64(str){
    var bytes = new TextEncoder().encode(str);
    var binary = "";
    for(var i=0;i<bytes.length;i++){ binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  }

  function setSyncStatus(msg, cls){
    var el = document.getElementById("syncStatus");
    if(!el) return;
    el.textContent = msg;
    el.className = "sync-status" + (cls ? " " + cls : "");
  }

  function ghConfigured(){
    return !!(ghConfig.owner && ghConfig.repo && ghConfig.token);
  }

  function refreshSyncStatusLabel(){
    if(!ghConfigured()){
      setSyncStatus("");
      return;
    }
    if(ghConfig.lastSync){
      var d = new Date(ghConfig.lastSync);
      var hh = String(d.getHours()).padStart(2, "0");
      var mm = String(d.getMinutes()).padStart(2, "0");
      setSyncStatus("GitHub: synced " + hh + ":" + mm, "ok");
    } else {
      setSyncStatus("GitHub: connected, not yet synced", "");
    }
  }

  function buildDataJsContent(){
    return "/* Site content — last pushed from the admin panel on " + new Date().toISOString() + " */\n" +
      "window.SITE_DEFAULT_DATA = " + JSON.stringify(state, null, 2) + ";\n";
  }

  function ghApiUrl(path, branch){
    var base = "https://api.github.com/repos/" + encodeURIComponent(ghConfig.owner) +
      "/" + encodeURIComponent(ghConfig.repo) + "/contents/" + path;
    return base + (branch ? ("?ref=" + encodeURIComponent(branch)) : "");
  }

  function ghHeaders(){
    return {
      "Authorization": "Bearer " + ghConfig.token,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    };
  }

  // Fetch a file's current sha (needed to update it). Returns null if the file doesn't exist yet.
  function ghGetSha(path, branch){
    return fetch(ghApiUrl(path, branch), { headers: ghHeaders() }).then(function(res){
      if(res.status === 404) return null;
      if(!res.ok) return res.json().then(function(body){
        throw new Error((body && body.message) || ("GitHub error " + res.status));
      });
      return res.json().then(function(body){ return body.sha; });
    });
  }

  function ghPutFile(path, branch, base64Content, message, sha){
    var payload = { message: message, content: base64Content, branch: branch };
    if(sha) payload.sha = sha;
    return fetch(ghApiUrl(path), {
      method: "PUT",
      headers: ghHeaders(),
      body: JSON.stringify(payload)
    }).then(function(res){
      if(!res.ok){
        return res.json().catch(function(){ return {}; }).then(function(body){
          throw new Error((body && body.message) || ("GitHub error " + res.status));
        });
      }
      return res.json();
    });
  }

  function extFromDataUrl(dataUrl){
    var m = /^data:image\/([a-zA-Z0-9+.-]+);base64,/.exec(dataUrl);
    var type = m ? m[1].toLowerCase() : "png";
    if(type === "jpeg") return "jpg";
    if(type.indexOf("svg") === 0) return "svg";
    return type;
  }

  function pushToGitHub(){
    if(!ghConfigured()){
      showToast("Set up GitHub sync first");
      openModal(document.getElementById("githubModal"));
      return Promise.resolve();
    }
    var branch = ghConfig.branch || "main";
    setSyncStatus("Pushing to GitHub…", "busy");
    document.getElementById("githubError").classList.remove("show");

    var photoStep = Promise.resolve();

    // If a custom photo was uploaded (data URL), push it as its own file first,
    // then point profile.photo at the new relative path instead of the data URL.
    if(state.profile.photo.indexOf("data:") === 0){
      var ext = extFromDataUrl(state.profile.photo);
      var photoPath = "assets/profile-custom." + ext;
      var base64Payload = state.profile.photo.split(",")[1];
      photoStep = ghGetSha(photoPath, branch).then(function(sha){
        return ghPutFile(photoPath, branch, base64Payload, "Update profile photo", sha);
      }).then(function(){
        state.profile.photo = photoPath;
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
        renderHero();
        applyEditableState();
      });
    }

    return photoStep.then(function(){
      return ghGetSha(GH_DATA_PATH, branch);
    }).then(function(sha){
      var content = utf8ToBase64(buildDataJsContent());
      return ghPutFile(GH_DATA_PATH, branch, content, "Update site content from admin panel", sha);
    }).then(function(){
      ghConfig.lastSync = new Date().toISOString();
      saveGhConfig(ghConfig);
      refreshSyncStatusLabel();
      showToast("Pushed to GitHub — live in about a minute");
    }).catch(function(err){
      setSyncStatus("GitHub push failed", "err");
      var msg = (err && err.message) || "Unknown error";
      var errEl = document.getElementById("githubError");
      errEl.textContent = "Push failed: " + msg;
      errEl.classList.add("show");
      showToast("GitHub push failed — see the sync panel");
    });
  }

  function scheduleAutoSync(){
    if(!adminMode || !ghConfig.autoSync || !ghConfigured()) return;
    clearTimeout(autoSyncTimer);
    setSyncStatus("Will push in a few seconds…", "busy");
    autoSyncTimer = setTimeout(function(){ pushToGitHub(); }, GH_AUTOSYNC_DELAY);
  }

  var githubModal = document.getElementById("githubModal");

  document.getElementById("btnGithub").addEventListener("click", function(){
    document.getElementById("ghOwner").value = ghConfig.owner || "";
    document.getElementById("ghRepo").value = ghConfig.repo || "";
    document.getElementById("ghBranch").value = ghConfig.branch || "main";
    document.getElementById("ghToken").value = ghConfig.token || "";
    document.getElementById("ghAutoSync").checked = !!ghConfig.autoSync;
    document.getElementById("githubError").classList.remove("show");
    var lastSyncEl = document.getElementById("githubLastSync");
    lastSyncEl.textContent = ghConfig.lastSync ? ("Last synced: " + new Date(ghConfig.lastSync).toLocaleString()) : "Never synced yet.";
    openModal(githubModal);
  });

  document.getElementById("githubCancel").addEventListener("click", function(){ closeModal(githubModal); });

  function readGhFormIntoConfig(){
    ghConfig.owner = document.getElementById("ghOwner").value.trim().replace(/^@/, "");
    ghConfig.repo = document.getElementById("ghRepo").value.trim();
    ghConfig.branch = document.getElementById("ghBranch").value.trim() || "main";
    ghConfig.token = document.getElementById("ghToken").value.trim();
    ghConfig.autoSync = document.getElementById("ghAutoSync").checked;
    saveGhConfig(ghConfig);
  }

  document.getElementById("ghSaveOnly").addEventListener("click", function(){
    readGhFormIntoConfig();
    refreshSyncStatusLabel();
    closeModal(githubModal);
    showToast("GitHub settings saved");
  });

  document.getElementById("ghPushNow").addEventListener("click", function(){
    readGhFormIntoConfig();
    closeModal(githubModal);
    pushToGitHub();
  });

  document.getElementById("ghForget").addEventListener("click", function(){
    if(!confirm("Forget the saved GitHub token and turn off auto-push? Your repo itself is unaffected.")) return;
    ghConfig = { owner: ghConfig.owner, repo: ghConfig.repo, branch: ghConfig.branch, token: "", autoSync: false, lastSync: ghConfig.lastSync };
    saveGhConfig(ghConfig);
    document.getElementById("ghToken").value = "";
    document.getElementById("ghAutoSync").checked = false;
    refreshSyncStatusLabel();
    showToast("Token forgotten");
  });

  refreshSyncStatusLabel();

  /* ---------------------------------------------------------
     Nav toggle (mobile)
     --------------------------------------------------------- */
  var navToggle = document.getElementById("navToggle");
  var navlinks = document.getElementById("navlinks");
  navToggle.addEventListener("click", function(){
    var open = navlinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navlinks.addEventListener("click", function(e){
    if(e.target.tagName === "A"){
      navlinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  document.getElementById("year").textContent = new Date().getFullYear();
  renderAll();

})();
