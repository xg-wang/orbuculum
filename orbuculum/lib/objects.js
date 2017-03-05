/**
 * Class definition for drawing obuculums and other stuff
 * Heavily depended on ECMAScript 6's new feature and gl-matrix
 * @Created by Xiaowen Zhang
 * @Edited on March 2nd, 2016
 */
"use strict";
var TWOD_MAPPING = 0;
var CUBE_MAPPING = 1;

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat((Array.isArray(toFlatten) || toFlatten instanceof Float32Array) ? flatten(toFlatten) : toFlatten);
  }, []);
}

class Shape {
    /** 
     * Function to be overloaded by specific class
     * 
     * Things to define: [name] [type] [meaning]
     * @ vertices [Array of vec3] 
     * @ indexed [Bool] if use webgl index mode
     * @ indices [Array of integers] Used in index mode
     * @ texMode = [enum]
     * @ texCoords [Array of vec2 or vec3]
     * @ normals [Bool] if use 
     */
    constructor(){
        this.vertices = [];
        this.normals = [];
        this.indices = [];
        this.texCoords = [];
        this.texMode = CUBE_MAPPING;
        this.indexed = true;
        this.sent_to_GPU = true;
    }
    link(gl, program) {
        this.program = program;
        this.coords_loc = gl.getAttribLocation(program, "coords");
        this.modelview_loc = gl.getUniformLocation(program, "modelview");
        this.projection_loc = gl.getUniformLocation(program, "projection");
    }
    upload(gl) {
        this.coordsBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.count = this.indexed ? this.indices.length : this.vertices.length;
        // push vertices to GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(this.vertices)), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

        this.copy_to_GPU = true;
    }
    render() { // to be overloaded
    }
}

class Sphere extends Shape {
    constructor (radius, slices, stacks) {
        super();
        this.radius = radius || 1;
        this.resolution = 15;
        var slices = slices || 32;
        var stacks = stacks || 16;
        var vertexCount = (slices+1)*(stacks+1);
        this.vertices = new Float32Array( 3*vertexCount );
        this.normals = new Float32Array( 3* vertexCount );
        this.texCoords = new Float32Array( 2*vertexCount );
        this.indices = new Uint16Array( 2*slices*stacks*3 );
        var du = 2*Math.PI/slices;
        var dv = Math.PI/stacks;
        var i,j,u,v,x,y,z;
        var indexV = 0;
        var indexT = 0;
        for (i = 0; i <= stacks; i++) {
            v = -Math.PI/2 + i*dv;
            for (j = 0; j <= slices; j++) {
                u = j*du;
                x = Math.cos(u)*Math.cos(v);
                y = Math.sin(u)*Math.cos(v);
                z = Math.sin(v);
                this.vertices[indexV] = this.radius*x;
                this.normals[indexV++] = x;
                this.vertices[indexV] = this.radius*y;
                this.normals[indexV++] = y;
                this.vertices[indexV] = this.radius*z;
                this.normals[indexV++] = z;
                this.texCoords[indexT++] = j/slices;
                this.texCoords[indexT++] = i/stacks;
            } 
        }
        var k = 0;
        for (j = 0; j < stacks; j++) {
            var row1 = j*(slices+1);
            var row2 = (j+1)*(slices+1);
            for (i = 0; i < slices; i++) {
                this.indices[k++] = row1 + i;
                this.indices[k++] = row2 + i + 1;
                this.indices[k++] = row2 + i;
                this.indices[k++] = row1 + i;
                this.indices[k++] = row1 + i + 1;
                this.indices[k++] = row2 + i + 1;
            }
        }
    }
    link(gl, program) {
        super.link(gl, program);
        this.normal_loc = gl.getAttribLocation(program, "normal");
        this.normalMV_loc = gl.getUniformLocation(program, "normalMV");
        this.invMV_loc = gl.getUniformLocation(program, "invMV");
    }
    upload(gl) {
        super.upload(gl);
        this.normalBuffer = gl.createBuffer();
        // push normals to GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(this.normals)), gl.STATIC_DRAW);

        this.copy_to_GPU = true;
    }
    render(projection, modelview, normalMV, invMV) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(this.coords_loc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.normal_loc, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(this.projection_loc, false, projection);
        gl.uniformMatrix4fv(this.modelview_loc, false, modelview);
        gl.uniformMatrix3fv(this.normalMV_loc, false, normalMV);
        gl.uniformMatrix3fv(this.invMV_loc, false, invMV);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements( gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0 );
    }
}