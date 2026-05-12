/* global THREE, io */
(function () {
  "use strict";

  var API = location.origin + "/api/racing";
  var ROOM = "lobby";
  var TARGET_LAPS = 3;
  var TRACK_ID = "bay";
  var MIN_SUBMIT_MS = 28000;

  var keys = { u: false, d: false, l: false, r: false };
  var state = {
    catalog: null,
    me: null,
    auth: false,
    socket: null,
    pickSlug: "bolt",
    raceT0: 0,
    submitted: false,
  };

  function api(path, opts) {
    return fetch(API + path, opts || {});
  }

  function setKey(code, down) {
    if (code === "KeyW" || code === "ArrowUp") keys.u = down;
    if (code === "KeyS" || code === "ArrowDown") keys.d = down;
    if (code === "KeyA" || code === "ArrowLeft") keys.l = down;
    if (code === "KeyD" || code === "ArrowRight") keys.r = down;
  }
  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) e.preventDefault();
    setKey(e.code, true);
  });
  window.addEventListener("keyup", function (e) {
    setKey(e.code, false);
  });

  function circuitPoints() {
    var pts = [];
    var a, x, z;
    for (var i = 0; i <= 64; i++) {
      a = (i / 64) * Math.PI * 2;
      x = Math.cos(a) * 22 + Math.sin(a * 3) * 2.8;
      z = Math.sin(a) * 14 + Math.cos(a * 2) * 3.2;
      pts.push(new THREE.Vector3(x, 0, z));
    }
    return pts;
  }

  function buildCarMaterials(bodyHex, accentHex) {
    var body = new THREE.MeshPhongMaterial({
      color: bodyHex,
      shininess: 80,
      specular: 0x444444,
    });
    var accent = new THREE.MeshPhongMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.12,
      shininess: 60,
    });
    var rubber = new THREE.MeshPhongMaterial({ color: 0x111010, shininess: 8 });
    return { body: body, accent: accent, rubber: rubber };
  }

  function buildCarGroup(mats) {
    var car = new THREE.Group();
    var body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.05, 16), mats.body);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.35, 0.35);
    car.add(body);
    var cabin = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), mats.body);
    cabin.scale.set(1.1, 0.5, 1.2);
    cabin.position.set(0, 0.55, -0.35);
    car.add(cabin);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.65), mats.body);
    roof.position.set(0, 0.72, -0.32);
    car.add(roof);
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 1.8), mats.accent);
    stripe.position.set(0, 0.62, 0.05);
    car.add(stripe);
    var bumper = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.12), mats.accent);
    bumper.position.set(0, 0.18, 0.95);
    car.add(bumper);
    function wheel(x, z) {
      var w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 14), mats.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.12, z);
      car.add(w);
      return w;
    }
    return {
      group: car,
      wheels: [wheel(0.52, 0.45), wheel(0.52, -0.45), wheel(-0.52, 0.45), wheel(-0.52, -0.45)],
    };
  }

  function vehiclePalette(slug) {
    if (slug === "runner") return buildCarMaterials(0x2563eb, 0xfbbf24);
    if (slug === "phantom") return buildCarMaterials(0x7c3aed, 0xe9d5ff);
    return buildCarMaterials(0xd90429, 0xffc400);
  }

  var canvas = document.getElementById("c");
  var W = window.innerWidth;
  var H = window.innerHeight;
  var path = new THREE.CatmullRomCurve3(circuitPoints(), true, "catmullrom", 0.45);
  var roadW = 3.4;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1118);
  scene.fog = new THREE.Fog(0x0d1118, 28, 120);

  var cam = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  scene.add(new THREE.HemisphereLight(0xb8c8e8, 0x1a1010, 0.55));
  scene.add(new THREE.AmbientLight(0x404868, 0.35));
  var sun = new THREE.DirectionalLight(0xfff5e6, 0.95);
  sun.position.set(18, 32, 14);
  scene.add(sun);

  var shape = new THREE.Shape();
  shape.moveTo(-roadW * 0.5, -0.02);
  shape.lineTo(roadW * 0.5, -0.02);
  shape.lineTo(roadW * 0.5, 0.02);
  shape.lineTo(-roadW * 0.5, 0.02);
  shape.lineTo(-roadW * 0.5, -0.02);
  var roadGeo = new THREE.ExtrudeGeometry(shape, { steps: 320, bevelEnabled: false, extrudePath: path });
  roadGeo.computeVertexNormals();
  var roadMesh = new THREE.Mesh(
    roadGeo,
    new THREE.MeshPhongMaterial({ color: 0x2a2e38, shininess: 12, specular: 0x222228 }),
  );
  roadMesh.position.y = 0.01;
  scene.add(roadMesh);

  function edgeLine(offsetX) {
    var g = new THREE.BufferGeometry();
    var segs = 400;
    var arr = new Float32Array((segs + 1) * 3);
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var p = path.getPointAt(t);
      var tan = path.getTangentAt(t).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var q = p.clone().add(side.multiplyScalar(offsetX));
      q.y = 0.06;
      arr[i * 3] = q.x;
      arr[i * 3 + 1] = q.y;
      arr[i * 3 + 2] = q.z;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffc400, transparent: true, opacity: 0.85 }));
  }
  scene.add(edgeLine(roadW * 0.42));
  scene.add(edgeLine(-roadW * 0.42));

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshPhongMaterial({ color: 0x152218, shininess: 4 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  scene.add(ground);

  var tune = { maxSpeed: 0.048, accel: 0.00085, brake: 0.00135, steer: 0.042, grip: 0.9 };
  var localBuilt = buildCarGroup(vehiclePalette("bolt"));
  var car = localBuilt.group;
  var wheels = localBuilt.wheels;
  scene.add(car);

  var u = 0;
  var lateral = 0;
  var lateralVel = 0;
  var speed = 0;
  var wheelSpin = 0;
  var prevU = 0;
  var laps = 0;
  var raceDone = false;
  var up = new THREE.Vector3(0, 1, 0);
  var pos = new THREE.Vector3();
  var tan = new THREE.Vector3();
  var side = new THREE.Vector3();

  function sideAt(t) {
    var tng = path.getTangentAt(t).normalize();
    return new THREE.Vector3().crossVectors(up, tng).normalize();
  }

  function placeCarOnPath(group, uu, lat) {
    var center = path.getPointAt(uu);
    tan.copy(path.getTangentAt(uu)).normalize();
    side.copy(sideAt(uu));
    pos.copy(center).add(side.clone().multiplyScalar(lat));
    pos.y = 0.22;
    group.position.copy(pos);
    var realUp = new THREE.Vector3().crossVectors(tan, side).normalize();
    var m = new THREE.Matrix4();
    m.makeBasis(side, realUp, tan);
    group.quaternion.setFromRotationMatrix(m);
    group.rotateZ(-lat * 0.12);
  }

  var peers = new Map();

  function ensurePeer(id, vehicle) {
    if (peers.has(id)) return peers.get(id);
    var mats = vehiclePalette(vehicle || "bolt");
    var built = buildCarGroup(mats);
    built.group.traverse(function (ch) {
      if (ch.material) ch.material = ch.material.clone();
    });
    scene.add(built.group);
    var p = { id: id, group: built.group, wheels: built.wheels, u: 0, lateral: 0, tu: 0, tl: 0, vehicle: vehicle || "bolt" };
    peers.set(id, p);
    return p;
  }

  function removePeer(id) {
    var p = peers.get(id);
    if (!p) return;
    scene.remove(p.group);
    peers.delete(id);
  }

  function applyTune(slug) {
    var v = state.catalog && state.catalog.vehicles ? state.catalog.vehicles.find(function (x) { return x.slug === slug; }) : null;
    if (!v) return;
    tune.maxSpeed = v.maxSpeed;
    tune.accel = v.accel;
    tune.brake = v.brake;
    tune.steer = v.steer;
    tune.grip = v.grip;
  }

  function swapLocalVehicle(slug) {
    scene.remove(car);
    localBuilt = buildCarGroup(vehiclePalette(slug));
    car = localBuilt.group;
    wheels = localBuilt.wheels;
    scene.add(car);
    applyTune(slug);
  }

  function netEmitState() {
    if (!state.socket || !state.socket.connected || raceDone) return;
    state.socket.emit("racing:state", {
      room: ROOM,
      u: u,
      lateral: lateral,
      v: Math.abs(speed) / (tune.maxSpeed || 0.05),
      vehicle: state.pickSlug,
    });
  }

  function connectSocket() {
    var nick = state.auth && state.me && state.me.username ? state.me.username : "Invite";
    var s = io({ path: "/ws", withCredentials: true, transports: ["websocket"], auth: { nick: nick } });
    state.socket = s;
    s.on("connect", function () {
      document.getElementById("netLine").textContent = "Réseau : connecté (salle " + ROOM + ")";
      s.emit("racing:join", ROOM);
    });
    s.on("disconnect", function () {
      document.getElementById("netLine").textContent = "Réseau : déconnecté";
    });
    s.on("racing:peer-state", function (data) {
      if (!data || !data.id) return;
      var p = ensurePeer(data.id, data.vehicle);
      p.tu = data.u;
      p.tl = data.lateral;
      p.vehicle = data.vehicle || "bolt";
    });
    s.on("racing:peer-left", function (data) {
      if (data && data.id) removePeer(data.id);
    });
  }

  function renderQuests() {
    var ul = document.getElementById("quests");
    ul.innerHTML = "";
    if (!state.auth || !state.me || !state.me.quests) return;
    state.me.quests.forEach(function (q) {
      var li = document.createElement("li");
      li.textContent = (q.done ? "✓ " : "") + q.title;
      if (q.done) li.className = "done";
      ul.appendChild(li);
    });
  }

  function renderMeta() {
    var authLine = document.getElementById("authLine");
    var creditLine = document.getElementById("creditLine");
    var vehLine = document.getElementById("vehLine");
    var pick = document.getElementById("vehPick");
    if (state.auth && state.me) {
      authLine.textContent = "Pilote : " + state.me.username;
      creditLine.textContent = "Crédits course : " + state.me.credits;
      vehLine.textContent = "Voiture : " + state.me.selectedVehicle;
      state.pickSlug = state.me.selectedVehicle;
      pick.innerHTML = "";
      (state.catalog.vehicles || []).forEach(function (def) {
        var o = document.createElement("option");
        o.value = def.slug;
        var own = state.me.ownedVehicles.indexOf(def.slug) >= 0;
        o.textContent = def.name + (own ? "" : " — " + def.price + " cr");
        if (def.slug === state.me.selectedVehicle) o.selected = true;
        pick.appendChild(o);
      });
      pick.style.display = "inline-block";
    } else {
      authLine.textContent = "Mode invité (multijoueur OK, pas de sauvegarde)";
      creditLine.textContent = "—";
      vehLine.textContent = "Voiture : " + state.pickSlug;
      pick.innerHTML = "";
      (state.catalog.vehicles || []).forEach(function (def) {
        var o = document.createElement("option");
        o.value = def.slug;
        o.textContent = def.name;
        if (def.slug === state.pickSlug) o.selected = true;
        pick.appendChild(o);
      });
      pick.style.display = "inline-block";
    }
    renderQuests();
    swapLocalVehicle(state.pickSlug);
  }

  async function refreshMe() {
    var r = await api("/me", { credentials: "include" });
    var j = await r.json();
    state.me = j;
    state.auth = j.authenticated === true;
    renderMeta();
  }

  document.getElementById("btnEquip").onclick = async function () {
    if (!state.auth) return alert("Connecte-toi sur Revise+ pour équiper.");
    var slug = document.getElementById("vehPick").value;
    var r = await api("/equip", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleSlug: slug }),
    });
    if (!r.ok) {
      var e = await r.json().catch(function () { return {}; });
      return alert(e.error || "Erreur équipement");
    }
    await refreshMe();
  };

  document.getElementById("btnBuy").onclick = async function () {
    if (!state.auth) return alert("Connecte-toi pour acheter.");
    var slug = document.getElementById("vehPick").value;
    var r = await api("/purchase", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleSlug: slug }),
    });
    if (!r.ok) {
      var e = await r.json().catch(function () { return {}; });
      return alert(e.error || "Erreur achat");
    }
    await refreshMe();
  };

  document.getElementById("btnRestart").onclick = function () {
    raceDone = false;
    state.submitted = false;
    laps = 0;
    u = 0;
    lateral = 0;
    lateralVel = 0;
    speed = 0;
    prevU = 0;
    state.raceT0 = 0;
    document.getElementById("lap").textContent = "0";
    document.getElementById("msg").textContent = "Bonne chance !";
  };

  async function submitRace(timeMs) {
    if (state.submitted || !state.auth) return;
    if (timeMs < MIN_SUBMIT_MS) {
      document.getElementById("msg").textContent = "Temps trop court pour valider côté serveur.";
      return;
    }
    state.submitted = true;
    var r = await api("/race-finish", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: TRACK_ID, timeMs: Math.round(timeMs) }),
    });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      state.submitted = false;
      document.getElementById("msg").textContent = j.error || "Erreur envoi course";
      return;
    }
    document.getElementById("msg").innerHTML =
      "Course enregistrée : +" +
      j.payout +
      " crédits" +
      (j.questBonus ? " + quêtes " + j.questBonus : "") +
      ". Total " +
      j.credits +
      ".";
    await refreshMe();
  }

  document.getElementById("target").textContent = String(TARGET_LAPS);

  function animate() {
    requestAnimationFrame(animate);
    var dt = 1 / 60;

    if (!raceDone) {
      if (keys.u || keys.d) {
        if (!state.raceT0) state.raceT0 = performance.now();
      }
      if (keys.u) speed += tune.accel;
      if (keys.d) speed -= tune.brake;
      speed -= 0.00035 * Math.sign(speed || 0);
      if (Math.abs(speed) < 0.0002) speed = 0;
      speed = Math.max(-tune.maxSpeed * 0.35, Math.min(tune.maxSpeed, speed));

      var steer = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      lateralVel += steer * tune.steer * (0.25 + Math.abs(speed) / tune.maxSpeed);
      lateralVel *= tune.grip;
      lateral += lateralVel * dt * 55;
      lateralVel *= 0.88;

      var half = roadW * 0.38;
      if (Math.abs(lateral) > half) {
        lateral = THREE.MathUtils.clamp(lateral, -half, half);
        lateralVel *= -0.35;
        speed *= 0.96;
        speed -= 0.004;
      }

      prevU = u;
      u = (u + speed * dt * 1.15) % 1;
      if (u < 0) u += 1;

      if (prevU > 0.85 && u < 0.15 && speed > 0.008) {
        laps++;
        document.getElementById("lap").textContent = String(laps);
        if (laps >= TARGET_LAPS) {
          raceDone = true;
          var elapsed = state.raceT0 ? performance.now() - state.raceT0 : MIN_SUBMIT_MS;
          document.getElementById("msg").textContent =
            "Arrivée ! " + (state.auth ? "Envoi au serveur…" : "Connecte-toi pour gagner des crédits.");
          if (state.auth) submitRace(elapsed);
          else document.getElementById("msg").textContent = "Arrivée (mode invité — connecte-toi pour crédits & quêtes).";
        }
      }

      placeCarOnPath(car, u, lateral);
      wheelSpin += speed * 420 * dt;
      wheels.forEach(function (w) {
        w.rotation.x = wheelSpin;
      });

      var kmh = Math.round((Math.abs(speed) / tune.maxSpeed) * 220);
      document.getElementById("speed").textContent = kmh + " km/h";
      if (state.raceT0 && !raceDone) {
        var sec = (performance.now() - state.raceT0) / 1000;
        document.getElementById("timer").textContent = sec.toFixed(1) + " s";
      }
    }

    peers.forEach(function (p) {
      p.u += (p.tu - p.u) * 0.18;
      p.lateral += (p.tl - p.lateral) * 0.18;
      placeCarOnPath(p.group, p.u, p.lateral);
      var spin = (p.tu - p.u) * 400 + 2;
      p.wheels.forEach(function (w) {
        w.rotation.x += spin * dt;
      });
    });

    tan.copy(path.getTangentAt(u)).normalize();
    var camTarget = car.position.clone().add(tan.clone().multiplyScalar(0.4));
    var back = tan.clone().multiplyScalar(-7.2);
    var lift = new THREE.Vector3(0, 3.1, 0);
    cam.position.copy(car.position).add(back).add(lift);
    cam.lookAt(camTarget.x, camTarget.y + 0.5, camTarget.z);

    renderer.render(scene, cam);
  }

  var netAccum = 0;
  function tickNet() {
    netAccum += 1;
    if (netAccum >= 3) {
      netAccum = 0;
      netEmitState();
    }
  }
  setInterval(tickNet, 50);

  window.addEventListener("resize", function () {
    W = window.innerWidth;
    H = window.innerHeight;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    renderer.setSize(W, H);
  });

  async function boot() {
    var cr = await api("/catalog");
    state.catalog = await cr.json();
    await refreshMe();
    document.getElementById("vehPick").onchange = function () {
      state.pickSlug = this.value;
      swapLocalVehicle(state.pickSlug);
    };
    connectSocket();
    placeCarOnPath(car, u, lateral);
    animate();
  }

  boot().catch(function (e) {
    console.error(e);
    document.getElementById("authLine").textContent = "Erreur chargement API";
  });
})();
