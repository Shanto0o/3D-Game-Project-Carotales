import Dude from "./Dude.js";

let canvas;
let engine;
let scene;
// vars for handling inputs
let inputStates = {};

window.onload = startGame;

function startGame() {
    canvas = document.querySelector("#myCanvas");
    engine = new BABYLON.Engine(canvas, true);
    scene = createScene();

    // modify some default settings (i.e pointer events to prevent cursor to go 
    // out of the game window)
    modifySettings();

    let tank = scene.getMeshByName("heroTank");

    engine.runRenderLoop(() => {
        let deltaTime = engine.getDeltaTime(); // remind you something ?

        tank.move();

        let heroDude = scene.getMeshByName("heroDude");
        if(heroDude)
            heroDude.Dude.move(scene);

        if(scene.dudes) {
            for(var i = 0 ; i < scene.dudes.length ; i++) {
                scene.dudes[i].Dude.move(scene);
            }
        }    

        scene.render();
    });
}

function createScene() {
    let scene = new BABYLON.Scene(engine);
    


    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0005;
    scene.fogColor = new BABYLON.Color3(0.9, 0.9, 1);
    

    var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size:10000.0}, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox/", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
    
    skybox.infiniteDistance = true;

    let ground = createGround(scene);
    let freeCamera = createFreeCamera(scene);
    let tank = createTank(scene);
    let followCamera = createFollowCamera(scene, tank);
    scene.activeCamera = followCamera;

    createLights(scene);
    createHeroDude(scene);
    createFloatingIslands(scene);
 
    return scene;
}

function createGround(scene) {
    const groundOptions = { width:2000, height:2000, subdivisions:20, minHeight:0, maxHeight:100, onReady: onGroundCreated};
    //scene is optional and defaults to the current scene
    const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("gdhm", 'images/hmap1.png', groundOptions, scene); 

    function onGroundCreated() {
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("images/grass.jpg");
        ground.material = groundMaterial;
        // to be taken into account by collision detection
        ground.checkCollisions = true;
        //groundMaterial.wireframe=true;
    }
    return ground;
}

function createLights(scene) {
    let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.4;

}

function createFloatingIslands(scene) {
    for (let i = 0; i < 20; i++) {
        let island = BABYLON.MeshBuilder.CreateSphere("island" + i, { diameter: 20 }, scene);
        island.position = new BABYLON.Vector3(
            Math.random() * 400 - 200,
            Math.random() * 30 + 10,
            Math.random() * 400 - 200
        );
        
        

        let material = new BABYLON.StandardMaterial("islandMaterial", scene);
        material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        island.material = material;
    }
}


function createFreeCamera(scene) {
    let camera = new BABYLON.FreeCamera("freeCamera", new BABYLON.Vector3(0, 50, 0), scene);
    camera.attachControl(canvas);
    // prevent camera to cross ground
    camera.checkCollisions = true; 
    // avoid flying with the camera
    camera.applyGravity = true;

    // Add extra keys for camera movements
    // Need the ascii code of the extra key(s). We use a string method here to get the ascii code
    camera.keysUp.push('z'.charCodeAt(0));
    camera.keysDown.push('s'.charCodeAt(0));
    camera.keysLeft.push('q'.charCodeAt(0));
    camera.keysRight.push('d'.charCodeAt(0));
    camera.keysUp.push('Z'.charCodeAt(0));
    camera.keysDown.push('S'.charCodeAt(0));
    camera.keysLeft.push('Q'.charCodeAt(0));
    camera.keysRight.push('D'.charCodeAt(0));

    return camera;
}

function createFollowCamera(scene, target) {
    let camera = new BABYLON.FollowCamera("tankFollowCamera", target.position, scene, target);

    camera.radius = 40;
    camera.heightOffset = 8; 
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.1;
    camera.maxCameraSpeed = 5;

    camera.beta = 0.8; 
    camera.lowerBetaLimit = 0.6;
    camera.upperBetaLimit = 2.0; 

    return camera;
}

let zMovement = 5;
function createTank(scene) {
    let tank = new BABYLON.MeshBuilder.CreateBox("heroTank", {height:1, depth:6, width:6}, scene);
    let tankMaterial = new BABYLON.StandardMaterial("tankMaterial", scene);
    tankMaterial.diffuseColor = new BABYLON.Color3.Red;
    tankMaterial.emissiveColor = new BABYLON.Color3.Blue;
    tank.material = tankMaterial;

    // By default the box/tank is in 0, 0, 0, let's change that...
    tank.position.y = 0.6;
    tank.speed = 1;
    tank.frontVector = new BABYLON.Vector3(0, 0, 1);

    tank.move = () => {
                //tank.position.z += -1; // speed should be in unit/s, and depends on
                                 // deltaTime !

        // if we want to move while taking into account collision detections
        // collision uses by default "ellipsoids"

        let yMovement = 0;
       
        if (tank.position.y > 2) {
            zMovement = 0;
            yMovement = -2;
        } 
        //tank.moveWithCollisions(new BABYLON.Vector3(0, yMovement, zMovement));

        if(inputStates.up) {
            //tank.moveWithCollisions(new BABYLON.Vector3(0, 0, 1*tank.speed));
            tank.moveWithCollisions(tank.frontVector.multiplyByFloats(tank.speed, tank.speed, tank.speed));
        }    
        if(inputStates.down) {
            //tank.moveWithCollisions(new BABYLON.Vector3(0, 0, -1*tank.speed));
            tank.moveWithCollisions(tank.frontVector.multiplyByFloats(-tank.speed, -tank.speed, -tank.speed));

        }    
        if(inputStates.left) {
            //tank.moveWithCollisions(new BABYLON.Vector3(-1*tank.speed, 0, 0));
            tank.rotation.y -= 0.02;
            tank.frontVector = new BABYLON.Vector3(Math.sin(tank.rotation.y), 0, Math.cos(tank.rotation.y));
        }    
        if(inputStates.right) {
            //tank.moveWithCollisions(new BABYLON.Vector3(1*tank.speed, 0, 0));
            tank.rotation.y += 0.02;
            tank.frontVector = new BABYLON.Vector3(Math.sin(tank.rotation.y), 0, Math.cos(tank.rotation.y));
        }

    }

    return tank;
}



function createHeroDude(scene) {
    BABYLON.SceneLoader.ImportMesh("", "models/Character/", "maxwell_the_cat_with_bones_animation.glb", scene, (newMeshes, particleSystems, skeletons) => {
        let heroCat = newMeshes[0];
        console.log("Meshes importés :", newMeshes);
        console.log("Matériaux disponibles :", scene.materials);

        heroCat.position = new BABYLON.Vector3(0, 0, 5);
        heroCat.scaling = new BABYLON.Vector3(10, 10, 10);
        heroCat.name = "heroCat";

       
        if (skeletons.length > 0) {
            scene.beginAnimation(skeletons[0], 0, 120, true, 1);
        }

      
        let heroSound = new BABYLON.Sound("maxwellSound", "sounds/maxwell.mp3", scene, null, {
            loop: true,
            autoplay: true,
            spatialSound: true
        });

        console.log("Son attaché au heroCat :", heroSound);

       
        heroSound.attachToMesh(heroCat);


        heroCat.sound = heroSound;

        console.log("Héros principal créé avec le son. Son :", heroCat.sound);


        let hero = new Dude(heroCat, 0.1, scene);


        scene.dudes = [heroCat];


        for (let i = 0; i < 4; i++) {
            let clone = doClone(heroCat, skeletons, i);
            scene.beginAnimation(clone.skeleton, 0, 120, true, 1);
            let temp = new Dude(clone, 0.3);


            let cloneSound = new BABYLON.Sound("cloneSound_" + i, "sounds/maxwell.mp3", scene, null, {
                loop: true,
                autoplay: true,
                spatialSound: true
            });

            console.log("Son attaché au clone " + i + " :", cloneSound);


            cloneSound.attachToMesh(clone);


            clone.sound = cloneSound;

            scene.dudes.push(clone);
        }
    });
}








function doClone(originalMesh, skeletons, id) {
    let myClone;
    let xrand = Math.floor(Math.random()*500 - 250);
    let zrand = Math.floor(Math.random()*500 - 250);

    myClone = originalMesh.clone("clone_" + id);
    myClone.position = new BABYLON.Vector3(xrand, 0, zrand);

    if(!skeletons) return myClone;

    // The mesh has at least one skeleton
    if(!originalMesh.getChildren()) {
        myClone.skeleton = skeletons[0].clone("clone_" + id + "_skeleton");
        return myClone;
    } else {
        if(skeletons.length === 1) {
            // the skeleton controls/animates all children, like in the Dude model
            let clonedSkeleton = skeletons[0].clone("clone_" + id + "_skeleton");
            myClone.skeleton = clonedSkeleton;
            let nbChildren = myClone.getChildren().length;

            for(let i = 0; i < nbChildren;  i++) {
                myClone.getChildren()[i].skeleton = clonedSkeleton
            }
            return myClone;
        } else if(skeletons.length === originalMesh.getChildren().length) {
            // each child has its own skeleton
            for(let i = 0; i < myClone.getChildren().length;  i++) {
                myClone.getChildren()[i].skeleton = skeletons[i].clone("clone_" + id + "_skeleton_" + i);
            }
            return myClone;
        }
    }

    return myClone;
}

window.addEventListener("resize", () => {
    engine.resize()
});

function modifySettings() {
    // as soon as we click on the game window, the mouse pointer is "locked"
    // you will have to press ESC to unlock it
    scene.onPointerDown = () => {
        if(!scene.alreadyLocked) {
            console.log("requesting pointer lock");
            canvas.requestPointerLock();
        } else {
            console.log("Pointer already locked");
        }
    }

    document.addEventListener("pointerlockchange", () => {
        let element = document.pointerLockElement || null;
        if(element) {
            // lets create a custom attribute
            scene.alreadyLocked = true;
        } else {
            scene.alreadyLocked = false;
        }
    })

    // key listeners for the tank
    inputStates.left = false;
    inputStates.right = false;
    inputStates.up = false;
    inputStates.down = false;
    inputStates.space = false;

    
    
    //add the listener to the main, window object, and update the states
    window.addEventListener('keydown', (event) => {
        if ((event.key === "ArrowLeft") || (event.key === "q")|| (event.key === "Q")) {
           inputStates.left = true;
        } else if ((event.key === "ArrowUp") || (event.key === "z")|| (event.key === "Z")){
           inputStates.up = true;
        } else if ((event.key === "ArrowRight") || (event.key === "d")|| (event.key === "D")){
           inputStates.right = true;
        } else if ((event.key === "ArrowDown")|| (event.key === "s")|| (event.key === "S")) {
           inputStates.down = true;
        }  else if (event.key === " ") {
           inputStates.space = true;
           shootBubble(scene, scene.getMeshByName("heroTank"));
        }
    }, false);

    //if the key will be released, change the states object 
    window.addEventListener('keyup', (event) => {
        if ((event.key === "ArrowLeft") || (event.key === "q")|| (event.key === "Q")) {
           inputStates.left = false;
        } else if ((event.key === "ArrowUp") || (event.key === "z")|| (event.key === "Z")){
           inputStates.up = false;
        } else if ((event.key === "ArrowRight") || (event.key === "d")|| (event.key === "D")){
           inputStates.right = false;
        } else if ((event.key === "ArrowDown")|| (event.key === "s")|| (event.key === "S")) {
           inputStates.down = false;
        }  else if (event.key === " ") {
           inputStates.space = false;
        }
    }, false);
}

function shootBubble(scene, tank) {
    let bubble = BABYLON.MeshBuilder.CreateSphere("bubble", {diameter: 2}, scene);
    bubble.position = tank.position.clone();
    bubble.position.y += 2; 
    bubble.material = new BABYLON.StandardMaterial("bubbleMaterial", scene);
    bubble.material.diffuseColor = new BABYLON.Color3(0.5, 0.7, 1);

    let bubbleSpeed = 2;
    let direction = tank.frontVector.clone();


    let bubbleInterval = scene.onBeforeRenderObservable.add(() => {
        bubble.position.addInPlace(direction.scale(bubbleSpeed));

 
        for (let i = 0; i < scene.dudes.length; i++) {
            let maxwell = scene.dudes[i];


            if (bubble.intersectsMesh(maxwell, false) || bubble.position.subtract(maxwell.position).length() < 5) {
                console.log("Maxwell touché ! 💥");


                console.log("Suppression de Maxwell :", maxwell.name);
                maxwell.dispose();
                scene.dudes.splice(i, 1);
                i--;


                bubble.dispose();
                scene.onBeforeRenderObservable.remove(bubbleInterval);
                return;
            }
        }
    });


    setTimeout(() => {
        bubble.dispose();
        scene.onBeforeRenderObservable.remove(bubbleInterval);
    }, 3000);
}
