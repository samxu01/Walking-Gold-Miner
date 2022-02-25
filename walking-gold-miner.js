import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';


const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

export class WalkingGoldMiner extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.left=false;
        this.right=false;
        this.position=0;
        this.light=false;
        this.time=0;
        this.x_list=[4, 0];
        this.y_list=[-3, 0];
        this.collide=false;
        this.collide_x=-999;
        this.collide_y=-999;
        this.hookTr = null;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
            sun: new defs.Subdivision_Sphere(4),
            planet_1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1.5),
            planet_2: new defs.Subdivision_Sphere(4),
            planet_3: new defs.Subdivision_Sphere(4),
            planet_4: new defs.Subdivision_Sphere(4),
            moon: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            backwall: new defs.Cube,
            flashbang: new defs.Cylindrical_Tube(3,15, [[0, 1], [0, 1]]),
            hook: new Shape_From_File("assets/hook.obj"),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: color(1, 1, 1, 1)}),
            gold: new Material(new defs.Phong_Shader(),
                {ambient: 0, color: hex_color("#FFD700")}),
            stone: new Material(new defs.Phong_Shader(),
                {ambient: 0, color: hex_color("#a8a3a3")}),
            planet_2: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .2, specular: 1, color: hex_color("#80FFFF")}),
            planet_2_g: new Material(new Gouraud_Shader(),
                {ambient: 0, diffusivity: .2, specular: 1, color: hex_color("#80FFFF")}),
            planet_3: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specular: 1, color: hex_color("#B08040")}),
            planet_3_ring: new Material(new Ring_Shader(),
                {color: hex_color("#B08040")}),
            planet_4: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specular: 1, color: hex_color("#C7E4EE")}),
            moon: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specular: 1, color: hex_color("#FA8072")}),
            Wall: new Material(new defs.Textured_Phong(1),
                {ambient: 0.5, diffusivity: 1, specular: 0.5, texture: new Texture("assets/soil-textures.png")}),
            ground: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 1, specular: 0.5, color: hex_color("#252323")}),
            hook: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#ffffff")}),
        }

        //use for hook transformation
        this.initial_camera_location = Mat4.look_at(vec3(0, 4, 20), vec3(0, 0, 0), vec3(0, 4, 0));
        this.isHookDropped=false;
        this.hookAngle=0;
        this.dropTime=0;
        this.hookPullYPos=0;
        this.pullTime=0;
        this.dropDistance=0;

        //use to check collision
        this.hookDropPos_x=-999
        this.hookDropPos_y=-999;

        //game parameter
        this.pullSpeed=0;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("move to the right", ["e"], () => {
            this.right=true;
        });
        this.key_triggered_button("move to the left", ["q"], () => {
            this.left=true;
        });
        this.key_triggered_button("drop a light", ["c"], () => {
            this.light=true;
        });
        this.key_triggered_button("Drop Hook", ["x"], () => {
            this.isHookDropped=true;
        });
    }

    detect_collision(x_list, y_list, x, y){
        for (let i = 0; i < x_list.length; i++){
            if (Math.abs(x-x_list[i]) <= 1 && Math.abs(y-y_list[i]) <= 1){
                this.collide = true;
                this.collide_x = x_list[i];
                this.collide_y = y_list[i];
                x_list[i] = -999;
                y_list[i] = -999;
                this.pullSpeed=10;
                return true;
            }
        }
        return false;
    }


    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Create Planets (Requirement 1)
        // this.shapes.[XXX].draw([XXX]) // <--example

        /*// draw the sun
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const omega = (1/10) * Math.PI;
        const whiteness = (1/2) * Math.cos(omega * t) + 1/2;
        let sun_material = this.materials.sun;
        sun_material.color = color(1, whiteness, whiteness, 1);
        let sun_transform = Mat4.identity();
        const sun_scale = Math.cos(omega * t) + 2;
        sun_transform = sun_transform.times(Mat4.scale(sun_scale, sun_scale, sun_scale));
        program_state.lights = [new Light(vec4(0, 0, 0, 1), color(1, whiteness, whiteness, 1), 10 ** sun_scale)];
        this.shapes.sun.draw(context, program_state, sun_transform, sun_material);*/

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        //draw character
        let chrac_tr = Mat4.identity();
        if (this.right===true && this.light===false)
        {
            this.position+=0.1;
            this.right=false;
        }
        else if (this.left===true && this.light===false)
        {
            this.position-=0.1;
            this.left=false;
        }
        chrac_tr = chrac_tr.times(Mat4.translation(this.position,5.1,0))
        program_state.lights = [new Light(vec4(this.position,20, 0, 1), color(1, 1, 1, 1), 10)];
        if(this.light===true)
        {
            this.time+=0.05;
            program_state.lights.push(new Light(vec4(this.position,-1*(this.time)+5, 0, 1), color(1, 1, 1, 1), 5));
            let flash_tr= Mat4.identity();
            flash_tr=flash_tr.times(Mat4.translation(this.position,-1*(this.time)+5,1)).times(Mat4.scale(0.05,0.8,0.05)).times(Mat4.rotation(Math.PI/2,1,0,0));
            this.shapes.flashbang.draw(context, program_state, flash_tr, this.materials.sun)
            if(this.time>=30)
            {
                this.light=false;
                this.time=0;
            }
        }

        this.shapes.planet_2.draw(context, program_state, chrac_tr, this.materials.planet_2)

        let stone_tr = Mat4.identity();
        stone_tr = stone_tr.times(Mat4.translation(this.x_list[0],this.y_list[0],-1))
        if (this.collide_x === 4 && this.collide_y === -3)
        {
            stone_tr = this.hookTr;
            stone_tr = stone_tr.times(Mat4.translation(0,-1,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, stone_tr, this.materials.stone)
        //draw gold
        let gold_tr= Mat4.identity();
        gold_tr= gold_tr.times(Mat4.translation(0,0,-1))
        this.shapes.planet_1.draw(context, program_state, gold_tr, this.materials.gold)

        //draw back wall
        let wall_tr= Mat4.identity();
        wall_tr=wall_tr.times(Mat4.translation(0,-4,-2)).times(Mat4.scale(20, 8, 0.1))
        this.shapes.backwall.draw(context, program_state, wall_tr, this.materials.Wall)

        //draw left wall
        let lwall_tr= Mat4.identity();
        lwall_tr= lwall_tr.times(Mat4.translation(-20,-4,0)).times(Mat4.scale(0.1, 8, 2))
        this.shapes.backwall.draw(context, program_state, lwall_tr, this.materials.Wall)

        //draw right wall
        let rwall_tr= Mat4.identity();
        rwall_tr= rwall_tr.times(Mat4.translation(20,-4,0)).times(Mat4.scale(0.1, 8, 2))
        this.shapes.backwall.draw(context, program_state, rwall_tr, this.materials.Wall)

        //draw upper wall
        let uwall_tr= Mat4.identity();
        uwall_tr= uwall_tr.times(Mat4.translation(0,4,0)).times(Mat4.scale(20, 0.1, 3))
        this.shapes.backwall.draw(context, program_state, uwall_tr, this.materials.ground)

        //draw bottom wall
        let bwall_tr= Mat4.identity();
        bwall_tr= bwall_tr.times(Mat4.translation(0,-12,0)).times(Mat4.scale(20, 0.1, 2))
        this.shapes.backwall.draw(context, program_state, bwall_tr, this.materials.Wall)


        //hook
        let hook_tr=Mat4.identity();
        hook_tr = hook_tr.times(Mat4.translation(0,2.9,-1));

        //hook before dropping
        if(!this.isHookDropped) {
            let angle_temp=Math.PI / 2.2 * Math.sin(t/0.8);
            hook_tr = hook_tr
                .times(Mat4.translation(0,1,0))
                .times(Mat4.rotation( angle_temp,0, 0, 1))
                .times(Mat4.translation(0,-1,0))
                .times(Mat4.scale(0.4, 0.4, 0.4));
            this.hookAngle=angle_temp;
            this.dropTime=t;
        }else{
            hook_tr = hook_tr
                .times(Mat4.translation(0,1,0))
                .times(Mat4.rotation(this.hookAngle, 0, 0, 1))
                .times(Mat4.translation(0,-1,0))
                .times(Mat4.scale(0.4, 0.4, 0.4))

            //drop hook + collision detect
            if(this.dropDistance<40 && !this.collide) {
                hook_tr = hook_tr
                    .times(Mat4.translation(0, -(t - this.dropTime) * 20, 0));
                this.hookPullYPos=-(t - this.dropTime) * 20;
                this.hookDropPos_y= (2.9-Math.abs((t - this.dropTime) * 20 * 0.4 * Math.cos(this.hookAngle))) ;
                this.hookDropPos_x=(t - this.dropTime) * 20 *0.4 * Math.sin(this.hookAngle) ;
                this.pullTime=t;
                this.dropDistance=(t - this.dropTime) * 20;

                let ifCollide = this.detect_collision(this.x_list,this.y_list,this.hookDropPos_x,this.hookDropPos_y);
                if(!ifCollide){
                    this.pullSpeed=50;
                }
                //check collision here!!!!!!!!!!!!!!!!!!!! use hookDropPos_y & hookDropPos_x

                //test
                /*let gol_tr= Mat4.identity();
                gol_tr= gol_tr.times(Mat4.translation(this.hookDropPos_x,this.hookDropPos_y,-1))
                this.shapes.planet_1.draw(context, program_state, gol_tr, this.materials.hook)*/
            }else{
                hook_tr = hook_tr
                    .times(Mat4.translation(0,this.hookPullYPos,0))
                    .times(Mat4.translation(0,(t-this.pullTime)*this.pullSpeed /*pull speed*/,0));
                this.hookTr = hook_tr;
                if((t-this.pullTime)*this.pullSpeed>this.dropDistance)//Time upperbound needs to be changed according to pull speed
                                    //Otherwise the hook will not be at the original position
                {
                    this.collide = false;
                    this.isHookDropped = false;
                    this.hookDropPos_x=-999;
                    this.hookDropPos_y=-999;
                    this.collide_x = -999;
                    this.collide_y = -999;
                    this.dropDistance=0;
                }
            }
        }

        this.shapes.hook.draw(context, program_state, hook_tr, this.materials.hook);

/*        let test_tr= Mat4.identity();
        test_tr= test_tr.times(Mat4.translation(3,0,0))
        this.shapes.planet_1.draw(context, program_state, test_tr, this.materials.hook)

        let test2_tr= Mat4.identity();
        test2_tr= test2_tr
            .times(Mat4.scale(0.4,0.4,0.4))
            .times(Mat4.translation(3/0.4,0,12))

        this.shapes.planet_1.draw(context, program_state, test2_tr, this.materials.gold)*/

        /*if (this.attached) {
            if (this.attached() == null)
            {
                let desired = this.initial_camera_location.map( (x,i) =>
                    Vector.from( program_state.camera_inverse[i] ).mix( x, 0.1 ) );
                program_state.set_camera(desired);
            }
            else
            {
                let desired = Mat4.inverse(this.attached().times(Mat4.translation(0, 0, 5)));
                desired = desired.map( (x,i) =>
                    Vector.from( program_state.camera_inverse[i] ).mix( x, 0.1 ) );
                program_state.set_camera(desired);
            }
        }*/
        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform bool gouraud;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec3 vertex_color;
        // ***** PHONG SHADING HAPPENS HERE: *****
                                          
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                vertex_color = phong_model_lights(N, vertex_worldspace);
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                gl_FragColor = vec4( vertex_color.xyz, 1.0 );
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            point_position = model_transform * vec4( position, 1.0 );
            center = model_transform * vec4( 0.0, 0.0, 0.0, 1.0 );
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            vec3 distance = vec3(point_position.xyz - center.xyz);
            gl_FragColor = vec4( vec3(.69, .502, .251), cos( length(distance) * 20.0 ));
        }`;
    }
}

