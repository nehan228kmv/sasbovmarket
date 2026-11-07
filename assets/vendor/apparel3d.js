/**
 * SASBOV MARKET — 3D PROCEDURAL APPAREL & AR TEXTURE SYNTHESIZER v2.0
 * High-End 3D Garment Mesh Generation, Texture Synthesis & Auto-Pose Fitting
 */

(function (global) {
  'use strict';

  const Apparel3D = {
    // Texture and material cache to ensure 60 FPS
    materialCache: new Map(),
    textureCache: new Map(),

    /**
     * Create 3D Garment Mesh Group based on product category & itemType
     * @param {THREE} THREE
     * @param {Object} product
     * @param {Object} options { color, scale, wireframe, category }
     * @returns {THREE.Group}
     */
    createGarment: function (THREE, product, options = {}) {
      const group = new THREE.Group();
      group.name = 'Garment3D_' + (product.id || 'item');

      const itemType = (product.itemType || product.category || '').toLowerCase();
      const material = this.createFabricMaterial(THREE, product, options);

      let garmentMesh = null;
      let garmentType = 'hoodie';

      if (itemType.includes('пуховик') || itemType.includes('down jacket')) {
        garmentMesh = this.buildPufferJacket(THREE, material, options);
        garmentType = 'puffer';
      } else if (itemType.includes('зип') || itemType.includes('zip')) {
        garmentMesh = this.buildZipHoodie(THREE, material, options);
        garmentType = 'ziphoodie';
      } else if (itemType.includes('куртка') || itemType.includes('ветровка') || itemType.includes('jacket')) {
        garmentMesh = this.buildTrackJacket(THREE, material, options);
        garmentType = 'jacket';
      } else if (itemType.includes('футболка') || itemType.includes('tee') || itemType.includes('лонгслив')) {
        garmentMesh = this.buildTShirt(THREE, material, options);
        garmentType = 'tshirt';
      } else if (itemType.includes('джинсы') || itemType.includes('штаны') || itemType.includes('pants') || itemType.includes('карго') || itemType.includes('свитпэнтс')) {
        garmentMesh = this.buildPants(THREE, material, options);
        garmentType = 'pants';
      } else if (itemType.includes('обувь') || itemType.includes('кроссовки') || itemType.includes('кеды') || itemType.includes('shoes')) {
        garmentMesh = this.buildSneakers(THREE, material, options);
        garmentType = 'sneakers';
      } else if (itemType.includes('очки') || itemType.includes('glasses') || itemType.includes('sunglasses')) {
        garmentMesh = this.buildSunglasses(THREE, options);
        garmentType = 'sunglasses';
      } else if (itemType.includes('кепка') || itemType.includes('шапка') || itemType.includes('cap') || itemType.includes('hat')) {
        garmentMesh = this.buildCap(THREE, material, options);
        garmentType = 'cap';
      } else {
        // Default: 3D Streetwear Hoodie
        garmentMesh = this.buildHoodie(THREE, material, options);
        garmentType = 'hoodie';
      }

      group.add(garmentMesh);
      group.userData.garmentMesh = garmentMesh;
      group.userData.garmentType = garmentType;
      group.userData.material = material;
      group.userData.product = product;

      return group;
    },

    /**
     * 1. 3D Streetwear Hoodie
     */
    buildHoodie: function (THREE, material, opts = {}) {
      const hoodie = new THREE.Group();
      hoodie.name = 'HoodieModel';

      // Torso (Oversized Streetwear Body with subtle organic curve)
      const torsoGeo = new THREE.CylinderGeometry(0.78, 0.72, 1.45, 32, 16);
      torsoGeo.scale(1.22, 1.0, 0.65);
      const torso = new THREE.Mesh(torsoGeo, material);
      torso.position.y = 0;
      torso.castShadow = true;
      torso.receiveShadow = true;
      hoodie.add(torso);

      // Bottom Ribbed Hem
      const hemGeo = new THREE.CylinderGeometry(0.72, 0.68, 0.16, 32);
      hemGeo.scale(1.2, 1.0, 0.62);
      const hemMat = material.clone();
      hemMat.roughness = 0.95;
      const hem = new THREE.Mesh(hemGeo, hemMat);
      hem.position.y = -0.76;
      hoodie.add(hem);

      // Kangaroo Front Pocket
      const pocketGeo = new THREE.CylinderGeometry(0.5, 0.54, 0.44, 16, 1, false, 0, Math.PI);
      pocketGeo.scale(1.12, 1.0, 0.35);
      const pocket = new THREE.Mesh(pocketGeo, material);
      pocket.position.set(0, -0.32, 0.42);
      hoodie.add(pocket);

      // Double-lined Hood (Arching over shoulders & neck)
      const hoodGeo = new THREE.SphereGeometry(0.48, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.72);
      hoodGeo.scale(1.08, 1.25, 1.15);
      const hood = new THREE.Mesh(hoodGeo, material);
      hood.position.set(0, 0.82, -0.12);
      hood.rotation.x = -0.2;
      hoodie.add(hood);

      // Left & Right Sleeves
      const leftSleeve = this.buildSleeve(THREE, material, -1);
      const rightSleeve = this.buildSleeve(THREE, material, 1);
      hoodie.add(leftSleeve);
      hoodie.add(rightSleeve);
      hoodie.userData.leftSleeve = leftSleeve;
      hoodie.userData.rightSleeve = rightSleeve;

      // Drawstrings with metal aglets
      const cordGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8);
      const cordMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 });
      
      const leftCord = new THREE.Mesh(cordGeo, cordMat);
      leftCord.position.set(-0.16, 0.52, 0.44);
      leftCord.rotation.z = -0.1;
      hoodie.add(leftCord);

      const rightCord = new THREE.Mesh(cordGeo, cordMat);
      rightCord.position.set(0.16, 0.52, 0.44);
      rightCord.rotation.z = 0.1;
      hoodie.add(rightCord);

      return hoodie;
    },

    /**
     * 2. 3D Zip-Hoodie with Central Metal Zipper
     */
    buildZipHoodie: function (THREE, material, opts = {}) {
      const zipHoodie = this.buildHoodie(THREE, material, opts);
      zipHoodie.name = 'ZipHoodieModel';

      // Add silver metal zipper track
      const zipGeo = new THREE.BoxGeometry(0.03, 1.48, 0.02);
      const zipMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 });
      const zipper = new THREE.Mesh(zipGeo, zipMat);
      zipper.position.set(0, -0.02, 0.44);
      zipHoodie.add(zipper);

      // Zipper pull tab
      const pullGeo = new THREE.BoxGeometry(0.025, 0.08, 0.015);
      const pull = new THREE.Mesh(pullGeo, zipMat);
      pull.position.set(0, 0.48, 0.47);
      zipHoodie.add(pull);

      return zipHoodie;
    },

    /**
     * 3. 3D Streetwear Oversized T-Shirt
     */
    buildTShirt: function (THREE, material, opts = {}) {
      const tee = new THREE.Group();
      tee.name = 'TShirtModel';

      // Torso (Boxy streetwear cut)
      const torsoGeo = new THREE.CylinderGeometry(0.74, 0.72, 1.35, 32);
      torsoGeo.scale(1.2, 1.0, 0.58);
      const torso = new THREE.Mesh(torsoGeo, material);
      torso.castShadow = true;
      torso.receiveShadow = true;
      tee.add(torso);

      // Crewneck ribbed collar
      const collarGeo = new THREE.TorusGeometry(0.26, 0.038, 12, 32);
      collarGeo.scale(1.15, 1.0, 1.0);
      const collarMat = material.clone();
      collarMat.roughness = 0.95;
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.set(0, 0.68, 0);
      collar.rotation.x = Math.PI / 2;
      tee.add(collar);

      // Relaxed Dropped Short Sleeves
      [-1, 1].forEach(side => {
        const sleevePivot = new THREE.Group();
        sleevePivot.name = side > 0 ? 'RightSleevePivot' : 'LeftSleevePivot';
        sleevePivot.position.set(side * 0.88, 0.58, 0);

        const sleeveGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.52, 20);
        sleeveGeo.scale(1.0, 1.0, 0.85);
        const sleeve = new THREE.Mesh(sleeveGeo, material);
        sleeve.position.set(side * 0.2, -0.22, 0);
        sleeve.rotation.z = side * -0.55;
        sleevePivot.add(sleeve);

        tee.add(sleevePivot);
      });

      return tee;
    },

    /**
     * 4. 3D Quilted Puffer Jacket
     */
    buildPufferJacket: function (THREE, material, opts = {}) {
      const jacket = new THREE.Group();
      jacket.name = 'PufferJacketModel';

      // Horizontal quilted chambers (baffles) with volume
      const baffles = 6;
      for (let i = 0; i < baffles; i++) {
        const t = i / (baffles - 1);
        const y = 0.55 - i * 0.24;
        const rad = 0.84 - Math.abs(t - 0.4) * 0.12;

        const baffleGeo = new THREE.TorusGeometry(rad, 0.13, 16, 32);
        baffleGeo.scale(1.24, 0.95, 0.68);
        const baffle = new THREE.Mesh(baffleGeo, material);
        baffle.position.set(0, y, 0);
        baffle.rotation.x = Math.PI / 2;
        baffle.castShadow = true;
        jacket.add(baffle);
      }

      // High Padded Storm Collar
      const collarGeo = new THREE.CylinderGeometry(0.44, 0.5, 0.36, 24);
      collarGeo.scale(1.1, 1.0, 0.92);
      const collar = new THREE.Mesh(collarGeo, material);
      collar.position.set(0, 0.84, 0);
      jacket.add(collar);

      // Heavy Puffy Sleeves
      [-1, 1].forEach(side => {
        const sleevePivot = new THREE.Group();
        sleevePivot.position.set(side * 0.98, 0.65, 0);

        for (let b = 0; b < 4; b++) {
          const segGeo = new THREE.SphereGeometry(0.26 - b * 0.015, 16, 16);
          segGeo.scale(1.0, 1.35, 0.92);
          const seg = new THREE.Mesh(segGeo, material);
          seg.position.set(side * b * 0.22, -b * 0.33, 0);
          seg.rotation.z = side * -0.32;
          sleevePivot.add(seg);
        }

        jacket.add(sleevePivot);
      });

      // Front Chunky Zipper
      const zipGeo = new THREE.BoxGeometry(0.035, 1.5, 0.025);
      const zipMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.85, roughness: 0.2 });
      const zip = new THREE.Mesh(zipGeo, zipMat);
      zip.position.set(0, 0.02, 0.58);
      jacket.add(zip);

      return jacket;
    },

    /**
     * 5. 3D Track Jacket / Windbreaker
     */
    buildTrackJacket: function (THREE, material, opts = {}) {
      const jacket = new THREE.Group();
      jacket.name = 'TrackJacketModel';

      // Technical shell torso
      const torsoGeo = new THREE.CylinderGeometry(0.76, 0.70, 1.4, 28);
      torsoGeo.scale(1.2, 1.0, 0.64);
      const torso = new THREE.Mesh(torsoGeo, material);
      jacket.add(torso);

      // Standup collar
      const collarGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.28, 24);
      const collar = new THREE.Mesh(collarGeo, material);
      collar.position.set(0, 0.78, 0);
      jacket.add(collar);

      // Raglan Sleeves
      const leftSleeve = this.buildSleeve(THREE, material, -1);
      const rightSleeve = this.buildSleeve(THREE, material, 1);
      jacket.add(leftSleeve);
      jacket.add(rightSleeve);

      // Front Zipper
      const zipGeo = new THREE.BoxGeometry(0.025, 1.42, 0.02);
      const zipMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8 });
      const zip = new THREE.Mesh(zipGeo, zipMat);
      zip.position.set(0, 0.04, 0.48);
      jacket.add(zip);

      return jacket;
    },

    /**
     * 6. 3D Baggy Denim / Cargo Pants
     */
    buildPants: function (THREE, material, opts = {}) {
      const pants = new THREE.Group();
      pants.name = 'PantsModel';

      // Waistband & Fly
      const waistGeo = new THREE.CylinderGeometry(0.72, 0.70, 0.22, 24);
      waistGeo.scale(1.15, 1.0, 0.7);
      const waist = new THREE.Mesh(waistGeo, material);
      waist.position.y = 0.6;
      pants.add(waist);

      // Left & Right Baggy Legs with subtle knee break
      [-1, 1].forEach(side => {
        const legGeo = new THREE.CylinderGeometry(0.36, 0.32, 1.75, 24);
        legGeo.scale(1.0, 1.0, 0.9);
        const leg = new THREE.Mesh(legGeo, material);
        leg.position.set(side * 0.42, -0.38, 0);
        pants.add(leg);

        // 3D Cargo Utility Pocket
        const pocketGeo = new THREE.BoxGeometry(0.14, 0.42, 0.3);
        const pocket = new THREE.Mesh(pocketGeo, material);
        pocket.position.set(side * 0.72, -0.26, 0);
        pants.add(pocket);
      });

      return pants;
    },

    /**
     * 7. 3D Chunky Streetwear Sneakers
     */
    buildSneakers: function (THREE, material, opts = {}) {
      const pair = new THREE.Group();
      pair.name = 'SneakersModel';

      [-1, 1].forEach(side => {
        const shoe = new THREE.Group();
        shoe.position.set(side * 0.45, 0, 0);

        // Chunky Sole
        const soleGeo = new THREE.BoxGeometry(0.42, 0.22, 0.95);
        const soleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
        const sole = new THREE.Mesh(soleGeo, soleMat);
        sole.position.y = -0.11;
        shoe.add(sole);

        // Upper body
        const upperGeo = new THREE.BoxGeometry(0.38, 0.28, 0.88);
        const upper = new THREE.Mesh(upperGeo, material);
        upper.position.set(0, 0.12, -0.04);
        shoe.add(upper);

        // Padded Tongue & collar
        const tongueGeo = new THREE.BoxGeometry(0.28, 0.32, 0.35);
        const tongue = new THREE.Mesh(tongueGeo, material);
        tongue.position.set(0, 0.26, -0.15);
        tongue.rotation.x = -0.3;
        shoe.add(tongue);

        pair.add(shoe);
      });

      return pair;
    },

    /**
     * 8. 3D Cyber Sunglasses
     */
    buildSunglasses: function (THREE, opts = {}) {
      const glasses = new THREE.Group();
      glasses.name = 'SunglassesModel';

      // Curved Shield Lens
      const lensGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.18, 24, 1, true, -Math.PI * 0.4, Math.PI * 0.8);
      const lensMat = new THREE.MeshPhysicalMaterial({
        color: 0x050505,
        metalness: 0.9,
        roughness: 0.05,
        transmission: 0.65,
        transparent: true,
        opacity: 0.9,
        reflectivity: 0.95
      });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.rotation.y = Math.PI / 2;
      glasses.add(lens);

      // Cyber Frame Temples
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.95, roughness: 0.1 });
      [-1, 1].forEach(side => {
        const templeGeo = new THREE.BoxGeometry(0.02, 0.03, 0.55);
        const temple = new THREE.Mesh(templeGeo, frameMat);
        temple.position.set(side * 0.36, 0, -0.26);
        glasses.add(temple);
      });

      return glasses;
    },

    /**
     * 9. 3D Baseball Cap
     */
    buildCap: function (THREE, material, opts = {}) {
      const cap = new THREE.Group();
      cap.name = 'CapModel';

      // Crown
      const crownGeo = new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      crownGeo.scale(1.0, 0.85, 1.1);
      const crown = new THREE.Mesh(crownGeo, material);
      cap.add(crown);

      // Curved Visor / Brim
      const visorGeo = new THREE.CylinderGeometry(0.44, 0.46, 0.03, 16, 1, false, 0, Math.PI);
      visorGeo.scale(1.0, 1.0, 0.8);
      const visor = new THREE.Mesh(visorGeo, material);
      visor.position.set(0, -0.02, 0.36);
      visor.rotation.x = 0.2;
      cap.add(visor);

      return cap;
    },

    /**
     * Helper: Build 3D Sleeve with Pivots
     */
    buildSleeve: function (THREE, material, side = 1) {
      const sleevePivot = new THREE.Group();
      sleevePivot.name = side > 0 ? 'RightSleevePivot' : 'LeftSleevePivot';
      sleevePivot.position.set(side * 0.88, 0.62, 0);

      // Upper arm
      const upperGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.75, 20);
      upperGeo.scale(1.0, 1.0, 0.85);
      const upper = new THREE.Mesh(upperGeo, material);
      upper.position.set(side * 0.26, -0.32, 0);
      upper.rotation.z = side * -0.55;
      sleevePivot.add(upper);

      // Forearm & Ribbed Cuff
      const foreGeo = new THREE.CylinderGeometry(0.20, 0.16, 0.72, 20);
      foreGeo.scale(1.0, 1.0, 0.82);
      const forearm = new THREE.Mesh(foreGeo, material);
      forearm.position.set(side * 0.52, -0.88, 0.08);
      forearm.rotation.z = side * -0.35;
      sleevePivot.add(forearm);

      // Ribbed wrist cuff
      const cuffGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.14, 16);
      const cuff = new THREE.Mesh(cuffGeo, material);
      cuff.position.set(side * 0.64, -1.22, 0.14);
      sleevePivot.add(cuff);

      return sleevePivot;
    },

    /**
     * Create Fabric Material with Dynamic Texture from Product
     */
    createFabricMaterial: function (THREE, product, options = {}) {
      const cacheKey = product.id + '_' + (options.wireframe ? 'wf' : 'solid');
      if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
      }

      // Generate dynamic canvas texture incorporating product image artwork
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // Base fabric color
      let baseColor = options.color || '#141418'; // Default dark streetwear
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 1024, 1024);

      // Subtle fabric weave texture
      for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }

      // Draw chest print / brand logo if product has an image
      if (product.image || (product.images && product.images[0])) {
        const imgPath = product.image || product.images[0];
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          // Intelligently sample dominant fabric color from product photo
          try {
            const sampleCanvas = document.createElement('canvas');
            sampleCanvas.width = 32;
            sampleCanvas.height = 32;
            const sCtx = sampleCanvas.getContext('2d');
            sCtx.drawImage(img, 0, 0, 32, 32);
            const data = sCtx.getImageData(8, 8, 16, 16).data;
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
              sumR += data[i];
              sumG += data[i + 1];
              sumB += data[i + 2];
              count++;
            }
            if (count > 0) {
              const r = Math.round(sumR / count);
              const g = Math.round(sumG / count);
              const b = Math.round(sumB / count);
              // Repaint base fabric color with authentic sampled garment tone
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillRect(0, 0, 1024, 1024);

              // Weave texture overlay
              for (let i = 0; i < 3500; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
                ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
              }

              // Brand typography on chest
              const isLight = (r * 0.299 + g * 0.587 + b * 0.114) > 130;
              ctx.font = 'bold 38px "Space Grotesk", sans-serif';
              ctx.fillStyle = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
              ctx.textAlign = 'center';
              if (product.brand) {
                ctx.fillText(product.brand.toUpperCase(), 512, 170);
              }
            }
          } catch (e) {}

          // Center product print on the chest (top-center of texture)
          const printSize = 440;
          const px = (1024 - printSize) / 2;
          const py = 200;

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 14;
          ctx.drawImage(img, px, py, printSize, printSize);
          ctx.restore();

          texture.needsUpdate = true;
          mat.needsUpdate = true;
        };
        img.src = imgPath;
      }

      // Draw brand typography on the chest
      ctx.font = 'bold 36px "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textAlign = 'center';
      if (product.brand) {
        ctx.fillText(product.brand.toUpperCase(), 512, 170);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      // Bump map for textile weave
      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = 256;
      bumpCanvas.height = 256;
      const bCtx = bumpCanvas.getContext('2d');
      bCtx.fillStyle = '#808080';
      bCtx.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 4) {
        bCtx.fillStyle = x % 8 === 0 ? '#909090' : '#707070';
        bCtx.fillRect(x, 0, 2, 256);
      }
      const bumpMap = new THREE.CanvasTexture(bumpCanvas);
      bumpMap.wrapS = THREE.RepeatWrapping;
      bumpMap.wrapT = THREE.RepeatWrapping;
      bumpMap.repeat.set(16, 16);

      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bumpMap,
        bumpScale: 0.02,
        roughness: 0.82,
        metalness: 0.06,
        wireframe: !!options.wireframe
      });

      this.materialCache.set(cacheKey, mat);
      return mat;
    },

    /**
     * Create 3D Studio Mannequin Avatar (Head, Torso, Limbs)
     */
    createAvatarMannequin: function (THREE, options = {}) {
      const avatar = new THREE.Group();
      avatar.name = 'StudioMannequin';

      const mannequinMat = new THREE.MeshStandardMaterial({
        color: 0x222228,
        metalness: 0.2,
        roughness: 0.5,
        wireframe: !!options.wireframe
      });

      // Head
      const headGeo = new THREE.SphereGeometry(0.32, 24, 24);
      headGeo.scale(0.85, 1.15, 0.95);
      const head = new THREE.Mesh(headGeo, mannequinMat);
      head.position.y = 1.95;
      avatar.add(head);

      // Neck
      const neckGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.28, 16);
      const neck = new THREE.Mesh(neckGeo, mannequinMat);
      neck.position.y = 1.62;
      avatar.add(neck);

      // Torso
      const torsoGeo = new THREE.CylinderGeometry(0.68, 0.52, 1.35, 24);
      torsoGeo.scale(1.05, 1.0, 0.58);
      const torso = new THREE.Mesh(torsoGeo, mannequinMat);
      torso.position.y = 0.85;
      avatar.add(torso);

      // Pelvis / Hips
      const hipsGeo = new THREE.CylinderGeometry(0.52, 0.58, 0.42, 24);
      hipsGeo.scale(1.05, 1.0, 0.6);
      const hips = new THREE.Mesh(hipsGeo, mannequinMat);
      hips.position.y = 0.05;
      avatar.add(hips);

      // Left & Right Legs
      [-1, 1].forEach(side => {
        const legGeo = new THREE.CylinderGeometry(0.24, 0.16, 1.85, 16);
        const leg = new THREE.Mesh(legGeo, mannequinMat);
        leg.position.set(side * 0.32, -1.05, 0);
        avatar.add(leg);

        // Foot
        const footGeo = new THREE.BoxGeometry(0.22, 0.15, 0.52);
        const foot = new THREE.Mesh(footGeo, mannequinMat);
        foot.position.set(side * 0.32, -2.02, 0.12);
        avatar.add(foot);
      });

      avatar.position.y = 0;
      return avatar;
    },

    /**
     * Auto-Fit 3D Garment to 33 MediaPipe Landmarks (Works for static photos & live webcam)
     * @param {THREE.Group} garmentGroup
     * @param {Array} lm Array of 33 landmarks with {x, y, z}
     * @param {THREE.Camera} camera
     * @param {Object} options { isMirrored, fitStyle, manualOffsets }
     */
    fitGarmentToLandmarks: function (garmentGroup, lm, camera, options = {}) {
      if (!garmentGroup || !lm || lm.length < 25) return false;

      const lSh = lm[11];
      const rSh = lm[12];
      const lHip = lm[23];
      const rHip = lm[24];
      const lElbow = lm[13];
      const rElbow = lm[14];
      const nose = lm[0];

      if (!lSh || !rSh) return false;

      const garmentType = garmentGroup.userData.garmentType || 'hoodie';
      const isMirrored = options.isMirrored !== false;
      const offsets = options.manualOffsets || { x: 0, y: 0, scale: 1, rotZ: 0 };

      // 1. Calculate Torso Center Coordinates in NDC (-1 to 1)
      let targetX = (lSh.x + rSh.x) / 2;
      let targetY = (lSh.y + rSh.y) / 2;

      // Adjust anchor based on garment type
      if (garmentType === 'pants') {
        if (lHip && rHip) {
          targetX = (lHip.x + rHip.x) / 2;
          targetY = (lHip.y + rHip.y) / 2 + 0.18;
        } else {
          targetY += 0.45;
        }
      } else if (garmentType === 'sneakers') {
        const lAnkle = lm[27];
        const rAnkle = lm[28];
        if (lAnkle && rAnkle) {
          targetX = (lAnkle.x + rAnkle.x) / 2;
          targetY = (lAnkle.y + rAnkle.y) / 2;
        } else {
          targetY += 0.85;
        }
      } else if (garmentType === 'sunglasses' || garmentType === 'cap') {
        if (nose) {
          targetX = nose.x;
          targetY = nose.y + (garmentType === 'cap' ? -0.12 : 0);
        } else {
          targetY -= 0.25;
        }
      }

      // Convert to Normalized Device Coordinates
      const ndcX = isMirrored ? -(targetX * 2 - 1) : (targetX * 2 - 1);
      const ndcY = -(targetY * 2 - 1);

      // Unproject to 3D world space
      const targetVector = new THREE.Vector3(ndcX, ndcY, 0.5);
      targetVector.unproject(camera);
      const dir = targetVector.sub(camera.position).normalize();

      // 2. Depth Distance Z based on shoulder span
      const shoulderSpan = Math.hypot(lSh.x - rSh.x, lSh.y - rSh.y);
      const safeSpan = Math.max(0.12, Math.min(0.85, shoulderSpan));
      const dist = (0.38 / safeSpan) * 2.8;

      const worldPos = camera.position.clone().add(dir.multiplyScalar(dist));

      // Apply vertical offset based on item type
      if (garmentType === 'hoodie' || garmentType === 'ziphoodie' || garmentType === 'jacket' || garmentType === 'tshirt' || garmentType === 'puffer') {
        worldPos.y -= 0.14 * dist;
      }

      // Manual offset adjustments
      worldPos.x += (offsets.x || 0);
      worldPos.y += (offsets.y || 0);

      // 3. Roll Angle (Z Rotation)
      let roll = isMirrored
        ? -Math.atan2(rSh.y - lSh.y, rSh.x - lSh.x)
        : Math.atan2(rSh.y - lSh.y, rSh.x - lSh.x);
      roll += (offsets.rotZ || 0);

      // 4. Yaw Angle (Y Rotation when turning sideways)
      const yaw = (rSh.z - lSh.z) * 2.6;

      // 5. Apply with smooth lerp
      garmentGroup.position.lerp(worldPos, 0.45);
      garmentGroup.rotation.z = THREE.MathUtils.lerp(garmentGroup.rotation.z, roll, 0.35);
      garmentGroup.rotation.y = THREE.MathUtils.lerp(garmentGroup.rotation.y, yaw, 0.35);

      // 6. Scale Calculation
      let baseScale = dist * 0.46;
      if (garmentType === 'pants') baseScale = dist * 0.48;
      if (garmentType === 'sneakers') baseScale = dist * 0.42;
      if (garmentType === 'sunglasses' || garmentType === 'cap') baseScale = dist * 0.32;

      const fitMultiplier = options.fitStyle === 'oversized' ? 1.15 : (options.fitStyle === 'baggy' ? 1.25 : 1.0);
      const targetScale = baseScale * fitMultiplier * (offsets.scale || 1.0);

      garmentGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.35);

      // 7. Dynamic sleeve bending if elbows tracked
      if (garmentGroup.userData && garmentGroup.userData.garmentMesh) {
        const model = garmentGroup.userData.garmentMesh;
        if (model.userData && model.userData.leftSleeve && lElbow) {
          const lAngle = Math.atan2(lElbow.y - lSh.y, lElbow.x - lSh.x);
          model.userData.leftSleeve.rotation.z = THREE.MathUtils.lerp(model.userData.leftSleeve.rotation.z, -lAngle * 0.6, 0.3);
        }
        if (model.userData && model.userData.rightSleeve && rElbow) {
          const rAngle = Math.atan2(rElbow.y - rSh.y, rElbow.x - rSh.x);
          model.userData.rightSleeve.rotation.z = THREE.MathUtils.lerp(model.userData.rightSleeve.rotation.z, rAngle * 0.6, 0.3);
        }
      }

      return true;
    }
  };

  global.Apparel3D = Apparel3D;

})(window);
