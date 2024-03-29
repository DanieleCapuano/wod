export const print_debug = _print_debug;
export const debug_print_buffer = _debug_print_buffer;
export const debug_print_transforms = _debug_print_transforms;

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
//this prints the final results of the graphics pipeline computation, i.e. what arrives to the fragment shader
function _print_debug(OI, canvas) {
    OI.objects_to_draw.forEach((obj) => {
        console.info("M MODELVIEW", obj.model_view_matrix.elements);
        console.info("M PROJECTION", OI.projection_matrix.elements);
        let ////////////////////////////////
            model_view_matrix = obj.model_view_matrix,
            projection_matrix = OI.projection_matrix,
            mvp = OI.projection_matrix.mul(
                obj.model_view_matrix
            );
        console.info("M MVP", mvp.elements);

        let //////////////////////////////////
            a = [],
            coords = obj.coords,
            j = 0,
            f32a = new Float32Array(coords.length * (obj.coords_dim + 1)); //obj.coords_dim + 1 because we're sending homogeneous coordinates to the GPU

        for (let i = 0; i < coords.length; i += obj.coords_dim) {
            console.info("IT", i, coords[i], coords[i + 1], coords[i + 2]);
            let ////////////////////////////////
                transf_vec_mv = model_view_matrix.mul(
                    glm.vec4(coords[i], coords[i + 1], coords[i + 2], 1.)
                ),
                transf_vec_pj = projection_matrix.mul(transf_vec_mv),
                tr_elems = transf_vec_pj.elements;

            console.info("TRANSFORMED COORDS MODELVIEW", transf_vec_mv.elements);
            console.info("TRANSFORMED COORDS PROJ", transf_vec_pj.elements);

            f32a[j] = tr_elems[0];
            f32a[j + 1] = tr_elems[1];
            f32a[j + 2] = tr_elems[2];
            f32a[j + 3] = tr_elems[3];

            a.push(glm.vec4(
                tr_elems[0] / tr_elems[3],
                tr_elems[1] / tr_elems[3],
                tr_elems[2] / tr_elems[3],
                1.
            ));

            j += 4;
        }
        let vl = 0,
            vr = canvas.width,
            vt = canvas.height,
            vb = 0,
            viewport_mat = glm.mat4(
                (vr - vl) / 2, 0, 0, 0,
                0, (vt - vb) / 2, 0, 0,
                0, 0, 1 / 2, 0,
                (vr + vl) / 2, (vt + vb) / 2, 1 / 2, 1
            );
        a = a.map(vec => viewport_mat.mul(vec));
        console.info("TRANSFORMED ARRS", f32a, a.map(vec => vec.elements).flat());
    });
}

function _debug_print_transforms(scene_config) {
    let o = scene_config.objects_to_draw[0];

    let P = scene_config.M_persp;
    let O = scene_config.M_ortho;
    let V = scene_config.view_matrix;
    let M = o.model_matrix;
    let canvas = scene_config.canvas;
    let dims = [canvas.width, canvas.height, 1];
    let screenPoints = o.coordinates_def.map((c, pi) => {
        let p = glm.vec4(c.concat(c.length === 3 ? [1] : []));
        console.info("p" + pi, p.elements);
        console.info("M*p" + pi, o.model_matrix.mul(p).elements);

        let VM = V.mul(M);
        console.info("VM*p" + pi, VM.mul(p).elements);

        let PVM = P.mul(VM);
        console.info("PVM*p" + pi, PVM.mul(p).elements);

        let OPVM = O.mul(PVM);
        let OPVMp = OPVM.mul(p);
        console.info("OPVM*p" + pi, OPVMp.elements);

        let cc = OPVMp;
        let pv = [cc[0] / cc[3], cc[1] / cc[3], cc[2] / cc[3]];
        let sc = pv.map((p, i) => {
            return ((p * .5) + .5) * dims[i];
        });
        return sc;
    });

    console.info("SCREEN POINTS", screenPoints);

    let
        DIMS = dims,
        targetPoints = [
            [
                596,
                888
            ],
            [
                999,
                799
            ],
            [
                1236,
                577
            ],
            [
                596,
                577
            ]
        ],
        pointsW = 0.9000000357627869,
        SPoints = targetPoints.map(sp => sp.concat(0.8897876385932113)),
        REVTransform = (parr) => {
            return parr.map((screenPoint, spi) => {
                let sp = screenPoint.map((pcoord, i) => {
                    return ((pcoord / DIMS[i]) - 0.5) * 2 * pointsW;
                });
                let spv = glm.vec4(sp.concat(pointsW));
                let O_inv = glm.inverse(O);
                let spv_O = O_inv.mul(spv);
                let P_inv = glm.inverse(P);
                let spv_OP = P_inv.mul(spv_O);
                let V_inv = glm.inverse(V);
                let spv_OPV = V_inv.mul(spv_OP);
                let M_inv = glm.inverse(M);
                let spv_OPVM = M_inv.mul(spv_OPV);
                return spv_OPVM;
            });
        };

    let rev = REVTransform(SPoints).map(revv => {
        let els = revv.elements;
        return [els[0], els[1], els[2]]
    });
    console.info("REVERSED", rev);
    console.info(JSON.stringify(rev));
}


function _debug_print_buffer(buffer, stride, i, littleEndian, has_texcoords) {
    const pos = stride * i;
    console.info("COORD", i, pos);
    console.info(
        buffer.getFloat32(pos + Float32Array.BYTES_PER_ELEMENT * 0, littleEndian),
        buffer.getFloat32(pos + Float32Array.BYTES_PER_ELEMENT * 1, littleEndian),
        buffer.getFloat32(pos + Float32Array.BYTES_PER_ELEMENT * 2, littleEndian),
        buffer.getInt8(pos + Float32Array.BYTES_PER_ELEMENT * 3 + Int8Array.BYTES_PER_ELEMENT * 0),
        buffer.getInt8(pos + Float32Array.BYTES_PER_ELEMENT * 3 + Int8Array.BYTES_PER_ELEMENT * 1),
        buffer.getInt8(pos + Float32Array.BYTES_PER_ELEMENT * 3 + Int8Array.BYTES_PER_ELEMENT * 2),
        buffer.getInt8(pos + Float32Array.BYTES_PER_ELEMENT * 3 + Int8Array.BYTES_PER_ELEMENT * 3)
    );
    if (has_texcoords) {
        console.info(
            buffer.getUint16(pos + Float32Array.BYTES_PER_ELEMENT * 3 + Int8Array.BYTES_PER_ELEMENT * 4 + Uint16Array.BYTES_PER_ELEMENT * 0, littleEndian),
            buffer.getUint16(pos + Float32Array.BYTES_PER_ELEMENT * 3 + Int8Array.BYTES_PER_ELEMENT * 4 + Uint16Array.BYTES_PER_ELEMENT * 1, littleEndian),
        );
    }
}