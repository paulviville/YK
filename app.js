
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000.0);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor('#e0e0e0');
document.body.appendChild(renderer.domElement);

controls = new THREE.OrbitControls(camera, renderer.domElement)
controls.enablePan = false;

window.addEventListener('resize', function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

window.addEventListener( 'mousedown', onMouseDown, false );
window.addEventListener( 'keydown', onKeyDown, false );
window.addEventListener( 'keyup', onKeyUp, false );


// GUI SETUP
let gui_params = {
	angles : {
		alpha: 30,
		beta: 45,
		nb_divs: 10,
		ratio: 1,
		directivite: 1
	},

	colors : {
		background : 0xe0e0e0,
		sphere_opacity : 0.3,
		surface_color : 0xBBFFBB,
		surface_opacity : 0.3,
		show_lines: true
	},
}

let gui = new dat.GUI({autoPlace: true, hideable: false});

let folder_angles = gui.addFolder("Paramètres");
folder_angles.add(gui_params.angles, 'alpha').name("vertical").min(0).max(179).step(1).onChange(update_angles);
folder_angles.add(gui_params.angles, 'beta').name("horizontal").min(0).max(179).step(1).onChange(update_angles);
folder_angles.add(gui_params.angles, 'nb_divs').name("integration divs").min(10).max(500).step(1).onChange(update_surface);
folder_angles.add(gui_params.angles, 'ratio').name("Dir").step(0.0001).listen();
folder_angles.add(gui_params.angles, 'directivite').name("Ind Dir").step(0.0001).listen();
folder_angles.open();

let folder_colors = gui.addFolder("Display");
folder_colors.addColor(gui_params.colors, 'background').onChange(update_background);
folder_colors.add(gui_params.colors, "sphere_opacity").min(0).max(1).step(0.1).onChange(update_mesh_display);
folder_colors.add(gui_params.colors, "show_lines").onChange(update_lines_display);
folder_colors.add(gui_params.colors, "surface_opacity").min(0).max(1).step(0.1).onChange(update_surface_display);
folder_colors.addColor(gui_params.colors, 'surface_color').onChange(update_surface_display);


let vZero = new THREE.Vector3();
let vX = new THREE.Vector3(1, 0, 0);
let vY = new THREE.Vector3(0, 1, 0);
let vZ = new THREE.Vector3(0, 0, 1);
let branch_lines;

function update_background()
{
	renderer.setClearColor(gui_params.colors.background);
}

function update_mesh_display()
{
	sphere.material.opacity = gui_params.colors.sphere_opacity;
}

function update_lines_display()
{
	if(geodesics_surface.parent)
		scene.remove(geodesics_surface);
	else
		scene.add(geodesics_surface);
}

function update_surface_display()
{
	surface.material.color.copy(new THREE.Color(gui_params.colors.surface_color));
	surface.material.opacity = gui_params.colors.surface_opacity;
}

function update_angles()
{
	// let alpha = gui_params.angles.alpha * Math.PI / 180;
	// let beta = gui_params.angles.beta * Math.PI / 180;

	// points[0].set(0, 0, 1);
	// points[1].set(0, 0, 1);
	// points[2].set(0, 0, 1);
	// points[3].set(0, 0, 1);
	// points[0].applyAxisAngle(vX, -alpha / 2);
	// points[0].applyAxisAngle(vY, -beta / 2);
	// points[1].applyAxisAngle(vX, alpha / 2);
	// points[1].applyAxisAngle(vY, -beta / 2);
	// points[2].applyAxisAngle(vX, alpha / 2);
	// points[2].applyAxisAngle(vY, beta / 2);
	// points[3].applyAxisAngle(vX, -alpha / 2);
	// points[3].applyAxisAngle(vY, beta / 2);
	let alpha = gui_params.angles.alpha * Math.PI / 180 / 2;
	let beta = gui_params.angles.beta * Math.PI / 180 / 2;

	// let sina = Math.sin(alpha);
	// let sinb = Math.sin(beta);
	// points[0].set(-sinb, -sina, 1);
	// points[1].set(sinb, -sina, 1);
	// points[2].set(sinb, sina, 1);
	// points[3].set(-sinb, sina, 1);

	let A = Math.sqrt(1 / Math.pow(Math.cos(alpha), 2) - 1);
	let B = Math.sqrt(1 / Math.pow(Math.cos(beta), 2) - 1);
	points[0].set(-B, -A, 1).normalize();
	points[1].set(B, -A, 1).normalize();
	points[2].set(B, A, 1).normalize();
	points[3].set(-B, A, 1).normalize();

    points_meshes[0].position.copy(points[0]);
    points_meshes[1].position.copy(points[1]);
    points_meshes[2].position.copy(points[2]);
	points_meshes[3].position.copy(points[3]);
	
	branch_lines.geometry.verticesNeedUpdate = true;

	update_geodesics();
}

let geodesics;
function update_geodesics()
{
	if(geodesics)
		scene.remove(geodesics);
	
	let geodesics_line_material = new THREE.LineBasicMaterial({linewidth: 3, color: 0x000000});
    geodesics = new THREE.Line(new THREE.Geometry(), geodesics_line_material);
	geodesics.geometry.vertices.push(...new_geodesic(points[0], points[1], 100));
	geodesics.geometry.vertices.push(...new_geodesic(points[1], points[2], 100));
	geodesics.geometry.vertices.push(...new_geodesic(points[2], points[3], 100));
	geodesics.geometry.vertices.push(...new_geodesic(points[3], points[0], 100));

	scene.add(geodesics);
	update_surface();
}

let surface;
let geodesics_surface;
function update_surface()
{
	if(surface)
		scene.remove(surface);
	if(geodesics_surface)
		scene.remove(geodesics_surface);
	

	let nb_divs = gui_params.angles.nb_divs;
	surface = new THREE.Mesh(new THREE.Geometry(), new THREE.MeshLambertMaterial({color: 0x11DD11, transparent: true, opacity: 0.3}));
	let geo0 = new_geodesic(points[0], points[1], nb_divs);
	let geo1 = new_geodesic(points[3], points[2], nb_divs);


	let geodesics_line_material = new THREE.LineBasicMaterial({linewidth: 3, color: 0xBBFFBB});
	geodesics_surface = new THREE.Group();
	
	for(let i = 0; i  < nb_divs + 1; ++i)
	{
		surface.geometry.vertices.push(...new_geodesic(geo0[i], geo1[i], nb_divs));
		let line = new THREE.Line(new THREE.Geometry(), geodesics_line_material);
		line.geometry.vertices.push(...new_geodesic(geo0[i], geo1[i], nb_divs));
		geodesics_surface.add(line);
	}

	let area = 0;
	for(let i = 0; i < nb_divs; ++i)
	{
		for(let j = 0; j < nb_divs; ++j)
		{
			let iA = j + (nb_divs + 1) * i
			let iB = (j + 1) + (nb_divs + 1) * i;
			let iC = (j + 1) + (nb_divs + 1) * (i + 1);
			let iD = j + (nb_divs + 1) * (i + 1);
			let A = surface.geometry.vertices[iA];
			let B = surface.geometry.vertices[iB];
			let C = surface.geometry.vertices[iC];
			let D = surface.geometry.vertices[iD];
			surface.geometry.faces.push(new THREE.Face3(iA, iD, iB));
			surface.geometry.faces.push(new THREE.Face3(iB, iD, iC));

			area += triangle_area(A, D, B);
			area += triangle_area(B, D, C);
		}
	}
	scene.add(surface);
	scene.add(geodesics_surface);

	gui_params.angles.ratio = area / (4 * Math.PI);
	gui_params.angles.directivite = 10*Math.log10(1 / gui_params.angles.ratio);
}

// function update_ratio()
// {

// }

// function compute_surface()
// {
// 	let nb_divs = gui_params.angles.nb_divs;
// 	let geo0 = new_geodesic(points[0], points[1], nb_divs);
// 	let geo1 = new_geodesic(points[3], points[2], nb_divs);
// 	let vertices = []
// 	for(let i = 0; i  < nb_divs + 1; ++i)
// 	{
// 		vertices.push(...new_geodesic(geo0[i], geo1[i], nb_divs));
// 	}

// 	let surface = 0;
// 	for(let i = 0; i < nb_divs; ++i)
// 	{
// 		for(let j = 0; j < nb_divs; ++j)
// 		{
// 			let A = vertices[j + (nb_divs + 1) * i];
// 			let B = vertices[(j + 1) + (nb_divs + 1) * i];
// 			let C = vertices[(j + 1) + (nb_divs + 1) * (i + 1)];
// 			let D = vertices[j + (nb_divs + 1) * (i + 1)];

// 			surface += triangle_area(A, B, D);
// 			surface += triangle_area(D, B, C);
// 		}
// 	}
// 	return surface;
// }

function triangle_area(A, B, C)
{
	let AB = B.clone().sub(A);
	let AC = C.clone().sub(A);
	return (AB.cross(AC).length())/2;
}

// USER INPUT HANDLING
let mouse = new THREE.Vector2();
let keys = new Array(256);
function onKeyDown(event)
{
    keys[event.which] = true;
    switch(event.which){
        default:
            break;
    }
}

function onKeyUp(event)
{
    console.log(event.which);
    keys[event.which] = false;
    switch(event.which){
        default:
            break;
    }
}

function onMouseMove(event)
{

}

function onMouseUp(event)
{
    window.removeEventListener( 'mousemove', onMouseMove, false );
    window.removeEventListener( 'mouseup', onMouseUp, false );
}

function onMouseDown(event)
{

}



var sphere;
var meshes;
var points_meshes;
var points;

var branch_points;
var branch_line_material = new THREE.LineBasicMaterial({linewidth: 2, color: 0x000000});
var branch_point_material = new THREE.MeshLambertMaterial({color: 0xDD0000});
var branch_point_geometry = new THREE.SphereGeometry( 0.025, 16, 16 );
function init_scene()
{

    let ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    scene.add(ambientLight);
    let pointLight = new THREE.PointLight(0xFFEEDD, 0.3);
    pointLight.position.set(1,1,1);
    scene.add(pointLight);

    let sphere_mat = new THREE.MeshLambertMaterial({color: 0xEEEEEE, transparent: true, opacity: 0.3});
    let sphere_geom = new THREE.SphereGeometry( 0.98, 64, 64 );
    sphere = new THREE.Mesh(sphere_geom, sphere_mat);
    sphere.name = "sphere";
    scene.add(sphere);

    let center_mat = new THREE.MeshLambertMaterial({color: 0x222222});
    let center_geom = new THREE.SphereGeometry( 0.025, 32, 32 );
    let center = new THREE.Mesh(center_geom, center_mat);
    center.name = "center";
    scene.add(center);

	let branch_line_material = new THREE.LineBasicMaterial({linewidth: 2, color: 0x000000});
	let branch_point_material = new THREE.MeshLambertMaterial({color: 0xDD0000});
	let branch_point_geometry = new THREE.SphereGeometry( 0.0125, 16, 16 );

	let vZero = new THREE.Vector3();
	let vX = new THREE.Vector3(1, 0, 0);
	let vY = new THREE.Vector3(0, 1, 0);
	let vZ = new THREE.Vector3(0, 0, 1);

	let alpha = gui_params.angles.alpha * Math.PI / 180 / 2;
	let beta = gui_params.angles.beta * Math.PI / 180 / 2;
	points = new Array(4);

	let A = Math.sqrt(1 / Math.pow(Math.cos(alpha), 2) - 1);
	let B = Math.sqrt(1 / Math.pow(Math.cos(beta), 2) - 1);
	points[0]= new THREE.Vector3(-B, -A, 1).normalize();
	points[1]= new THREE.Vector3(B, -A, 1).normalize();
	points[2]= new THREE.Vector3(B, A, 1).normalize();
	points[3]= new THREE.Vector3(-B, A, 1).normalize();
	// let sina = Math.sin(alpha);
	// let sinb = Math.sin(beta);
	// points[0] = new THREE.Vector3(-sinb, -sina, 1);
	// points[1] = new THREE.Vector3(sinb, -sina, 1);
	// points[2] = new THREE.Vector3(sinb, sina, 1);
	// points[3] = new THREE.Vector3(-sinb, sina, 1);
	// points[0] = new THREE.Vector3(0, 0, 1);
	// points[1] = new THREE.Vector3(0, 0, 1);
	// points[2] = new THREE.Vector3(0, 0, 1);
	// points[3] = new THREE.Vector3(0, 0, 1);
	// points[0].applyAxisAngle(vX, -alpha);
	// points[0].applyAxisAngle(vY, -beta);
	// points[1].applyAxisAngle(vX, alpha);
	// points[1].applyAxisAngle(vY, -beta);
	// points[2].applyAxisAngle(vX, alpha);
	// points[2].applyAxisAngle(vY, beta);
	// points[3].applyAxisAngle(vX, -alpha);
	// points[3].applyAxisAngle(vY, beta);
	points_meshes = new Array(4);
	points_meshes[0] = new THREE.Mesh(branch_point_geometry, branch_point_material);
	points_meshes[1] = new THREE.Mesh(branch_point_geometry, branch_point_material);
	points_meshes[2] = new THREE.Mesh(branch_point_geometry, branch_point_material);
	points_meshes[3] = new THREE.Mesh(branch_point_geometry, branch_point_material);
    points_meshes[0].position.copy(points[0]);
    points_meshes[1].position.copy(points[1]);
    points_meshes[2].position.copy(points[2]);
    points_meshes[3].position.copy(points[3]);
	scene.add(points_meshes[0]);
	scene.add(points_meshes[1]);
	scene.add(points_meshes[2]);
	scene.add(points_meshes[3]);

	update_geodesics();

	let branch_line_geometry = new THREE.Geometry();
    branch_line_geometry.vertices.push(points[0], vZero);
    branch_line_geometry.vertices.push(points[1], vZero);
    branch_line_geometry.vertices.push(points[2], vZero);
    branch_line_geometry.vertices.push(points[3], vZero);
    branch_lines = new THREE.Line(branch_line_geometry, branch_line_material)
    scene.add(branch_lines);

}



let angle = function(A, B, C){
    let sB = slerp(A, B, 0.01);
    let sC = slerp(A, C, 0.01);
    let AB = (sB.clone().sub(A)).normalize();
    let AC = (sC.clone().sub(A)).normalize();
    let X = AB.clone().cross(AC).normalize();
    let a = AB.angleTo(AC);
    if(A.dot(X) < 0)
        a = -a;
    return a;
}






// MAIN LOOP
function start()
{
    init_scene();
    rendering_loop();
}

function update()
{

}

function render()
{
    renderer.render(scene, camera);
}

function rendering_loop()
{
    update();
    render();

    requestAnimationFrame(rendering_loop);
}

start();