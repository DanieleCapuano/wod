export const create_program = _create_program;
export const init_vao = _init_vao;
export const set_uniforms = _set_uniforms;


function _create_program(gl, vert, frag) {
    const program = gl.createProgram();

    // Attach pre-existing shaders
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw `Could not compile WebGL program. \n\n${info}`;
    }

    return program;
}

function _init_vao(gl, program_info) {
    const { program, attributes_desc, uniforms_desc } = program_info;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    attributes_desc.forEach((attr_desc) => {
        let attribLoc = gl.getAttribLocation(program, attr_desc.name);
        gl.vertexAttribPointer.call(gl, [attribLoc].concat(attr_desc.opts));
        gl.enableVertexAttribArray(attribLoc);

        program_info.attributes[attr_desc.name] = attribLoc;
    });

    uniforms_desc.forEach((uniform_desc) => {    
        program_info.uniforms[uniform_desc.name] = gl.getUniformLocation(program, uniform_desc.name);
    });

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    program_info.vao = vao;
    return program_info;
}

function _set_uniforms(gl, program_desc) {
    
}