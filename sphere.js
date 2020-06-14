function on_sphere(point)
{
	point.normalize();
}

function slerp(A, B, alpha, out = false)
{
	let sl = new THREE.Vector3();
	let phi = A.angleTo(B);
	if(out) phi = phi - 2*Math.PI;
	let s0 = Math.sin(phi*(1-alpha));
	let s1 = Math.sin(phi*alpha);
	let s2 = Math.sin(phi);
	sl.addScaledVector(A, s0 / s2);
	sl.addScaledVector(B, s1 / s2);
	return sl;
}

function qslerp(A, B, alpha, out = false)
{
	let quat0 = new THREE.Quaternion();
	let quat1 = new THREE.Quaternion();
	quat0.setFromUnitVectors(A, B);
	quat1.slerp(quat0, alpha);
	console.log(quat0, quat1);
	let sl = new THREE.Vector3();
	sl.copy(A).applyQuaternion(quat1);
	console.log(sl, A, B);
	return sl;
}


function geodesic_length(A, B)
{
	return A.angleTo(B);
}

function new_geodesic(A, B, nb_divs = 200, out = false)
{
	let geodesic = [];
	let phi = A.angleTo(B);
	if(out) phi -= 2*Math.PI;
	let s2 = Math.sin(phi);
	let s0 = 0;
	let s1 = 0;
	for(let i = 0; i <= nb_divs; i++)
	{
		let p = new THREE.Vector3();
		alpha = i / nb_divs;
		s0 = Math.sin(phi*(1-alpha));
		s1 = Math.sin(phi*alpha);
		p.addScaledVector(A, s0 / s2);
		p.addScaledVector(B, s1 / s2);
		geodesic.push(p);
	}
	return geodesic;
}

function subdivide_triangle(A, B, C, divs)
{
	if(divs < 2) 
		return [A, B, C];

	let vertices = [];
	for(let i = 0; i <= divs; ++i)
	{
		let ab = slerp(A, B, i / divs);
		let ac = slerp(A, C, i / divs);
		if(i == 0)
			vertices.push(ab);
		else
			for(let j = 0; j <= i; ++j)
				vertices.push(slerp(ab, ac, j / i));
	}

	return vertices;
}

function in_sphere_triangle(P, U, V, W)
{
	let n0 = new THREE.Vector3();
	let n1 = new THREE.Vector3();
	let n2 = new THREE.Vector3();
	n0.copy(U).cross(V);
	n1.copy(V).cross(W);
	n2.copy(W).cross(U);

	return (P.dot(n0) > 0 && P.dot(n1) > 0 && P.dot(n2) > 0);
}

function in_sphere_quad(P, U, V, W, X)
{
    return in_sphere_triangle(P, U, V, W) || in_sphere_triangle(P, W, X, U); 

}

function triangle_onsphere_circumcenter(a, b, c)
{
	let n = new THREE.Vector3();
	let t0 = new THREE.Vector3();
	let t1 = new THREE.Vector3();
	t0.subVectors(b, a);
	t1.subVectors(c, a);
	n.crossVectors(t0, t1).normalize();
	return n;
}

function tetrahedron_circumcenter(x0, x1, x2, x3)
{
	let a0 = new THREE.Vector3();
	let a1 = new THREE.Vector3();
	let a2 = new THREE.Vector3();
	a0.subVectors(x1, x0);
	a1.subVectors(x2, x0);
	a2.subVectors(x3, x0);
	let A = new THREE.Matrix3();
	A.set(	a0.x, a0.y, a0.z, 
			a1.x, a1.y, a1.z,
			a2.x, a2.y, a2.z );
		
	let B = new THREE.Vector3();
	let dx0 = x0.dot(x0);
	B.x = (x1.dot(x1) - dx0) / 2;
	B.y = (x2.dot(x2) - dx0) / 2;
	B.z = (x3.dot(x3) - dx0) / 2;

	let A_1 = new THREE.Matrix3();
	A_1.getInverse(A);

	let C = new THREE.Vector3();
	C.copy(B);
	C.applyMatrix3(A_1);
	return C;
}

function convex_hull(points)
{
	let triangles = [];
	let pos = [];

	let n = new THREE.Vector3();
	let t0 = new THREE.Vector3();
	let t1 = new THREE.Vector3();
	let v = new THREE.Vector3();
	let d;
	let ops = 0;

	if(points.length == 3)
		triangles.push([0, 1, 2],[0, 2, 1]);

	for(let i = 0; i < points.length - 2; i++)
	{
		for(let j = i+1; j < points.length - 1; j++)
		{
			for(let k = j+1; k < points.length; k++)
			{
				t0.subVectors(points[j], points[i]);
				t1.subVectors(points[k], points[i]);
				n.crossVectors(t0, t1);
				
				let sign = 0;
				
				for(let m = 0; m < points.length; m++)
				{
					if(m == i || m == j || m == k)
						continue;
					
					v.subVectors(points[m], points[i]);
					d = v.dot(n);
					if(!sign)
						sign = (d < 0? -1: 1);
					else
					{
						if(sign != (d < 0? -1: 1))
						{
							sign = 0;
							break;
						}
					}
				}

				switch(sign)
				{
					case 1:
						triangles.push([j, i, k]);
						break;
					case -1:
						triangles.push([i, j, k]);
						break;
					default:
						break;
				}
			}	
		}	
	}
	return triangles;
}

function barycenter(points)
{
	let bary = new THREE.Vector3();
	points.forEach(p => {
			bary.add(p)
		});

	bary.normalize();

	if(points.length > 2)
	{
		// let norm = new THREE.Vector3();
		// let v0, v1, vc;
		// for(let i = 0; i < points.length; ++i)
		// {
		// 	v0 = points[i].clone();			
		// 	v1 = points[(i + 1) % points.length].clone();
		// 	vc = v0.clone().cross(v1);
		// 	norm.add(vc);
		// }
		// norm.normalize();


		let norm = new THREE.Vector3();
		let v0, v1, vc;
		for(let i = 2 ; i < points.length; ++i)
		{
			v0 = points[i - 1].clone().sub(points[0]);
			v1 = points[i].clone().sub(points[0]);
			vc = v0.clone().cross(v1);
			norm.add(vc);
		}
		norm.normalize();
		if(norm.dot(bary) <0)
			bary.negate();

	}

	return bary;
}

