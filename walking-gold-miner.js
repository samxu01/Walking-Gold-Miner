import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';


const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

export class WalkingGoldMiner extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.light_x=0;
        this.light_y=0;
        this.light_time=0;
        this.fireflies=true;
        this.left=false;
        this.right=false;
        this.position=0;
        this.light=false;
        this.time=0;
        this.x_list=[4, 1, 12, -3 , -10, -6];
        this.y_list=[-3, 0, -3, -7, -2, -4];
        this.collide=false;
        this.collide_x=-99;
        this.collide_y=-99;
        this.hookTr = null;

        this.isStopped=true;
        this.leftArm_angle=-0.3;
        this.rightArm_angle=0.3;


        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            sun: new defs.Subdivision_Sphere(4),
            planet_1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1.5),
            backwall: new defs.Cube,
            skyscraper: new defs.Cube,
            flashbang: new defs.Cylindrical_Tube(3,15, [[0, 1], [0, 1]]),
            hook: new Shape_From_File("assets/hook.obj"),
            miner: new Shape_From_File("assets/miner.obj"),
            miner_head: new defs.Subdivision_Sphere(4),
            miner_hat:new defs.Rounded_Closed_Cone(15,15,[[0, 1], [0, 1]]),
            miner_body: new defs.Cube,
        };

        // *** Materials
        this.materials = {
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: color(1, 1, 1, 1)}),
            sun1: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: color(1, 1, 1, 1)}),
            gold: new Material(new defs.Phong_Shader(),
                {ambient: 0, color: hex_color("#FFD700")}),
            stone: new Material(new defs.Phong_Shader(),
                {ambient: 0, color: hex_color("#a8a3a3")}),
            skyscraper: new Material(new defs.Textured_Phong(1),
                {ambient: 1, diffusivity: 1, specular: 0.5, texture: new Texture("assets/skyscraper.jpg","NEAREST")}),
            sky: new Material(new defs.Textured_Phong(1),
                {ambient: 1, diffusivity: 1, specular: 0.5, texture: new Texture("assets/night.jpg")}),
            Wall: new Material(new defs.Textured_Phong(1),
                {ambient: 1, diffusivity: 1, specular: 0.5, texture: new Texture("assets/soil4.jpg")}),
            ground: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 1, specular: 0.5, color: hex_color("#252323")}),
            hook: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#ffffff")}),
            miner: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#CC9877")}),
            background: new Material(new defs.Textured_Phong(1),
                {ambient: 1, diffusivity: 1, specular: 1, texture: new Texture("assets/city.png")}),
            miner_skin: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#CC9877")}),
            miner_hat: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#FF7A1F")}),
            miner_cloth: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#6A6A6A")}),
            miner_pants: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#223D5F")}),
            miner_beard: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#301F03")}),
            miner_eye: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 1, specular: 0.5, color: hex_color("#000000")}),

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
            this.isStopped=false;
        });
        this.key_triggered_button("move to the left", ["q"], () => {
            this.left=true;
            this.isStopped=false;
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
                x_list[i] = -99;
                y_list[i] = -99;
                this.pullSpeed=10;
                return true;
            }
        }
        return false;
    }


    display(context, program_state) {

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);



        //draw character
        //let chrac_tr = Mat4.identity();
        let miner_head_tr  = Mat4.identity();
        let miner_hat_tr  = Mat4.identity();
        let miner_arm_left_tr  = Mat4.identity();
        let miner_arm_right_tr  = Mat4.identity();
        let miner_cloth_tr  = Mat4.identity();
        let miner_leg_left_tr  = Mat4.identity();
        let miner_leg_right_tr  = Mat4.identity();
        let miner_beard_tr  = Mat4.identity();
        let miner_eye_left_tr  = Mat4.identity();
        let miner_eye_right_tr  = Mat4.identity();


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

        miner_head_tr = miner_head_tr.times(Mat4.translation(this.position,5.8,2.2))
            .times(Mat4.scale(0.35,0.43,0.4))

        miner_hat_tr = miner_hat_tr.times(Mat4.translation(this.position,6.15,2.2))
            .times(Mat4.rotation(Math.PI/2,-1,0,0))
            .times(Mat4.scale(0.55,0.55,0.25))

        miner_arm_left_tr  = miner_arm_left_tr.times(Mat4.translation(-0.4+this.position,5.1,2.2))
        miner_arm_right_tr  = miner_arm_right_tr.times(Mat4.translation(0.4+this.position,5.1,2.2))
        if(!this.isStopped){
            if(Math.floor(2*t)%2==0){
                this.leftArm_angle-=0.02;
                miner_arm_left_tr  = miner_arm_left_tr
                    .times(Mat4.rotation(this.leftArm_angle,0,0,1))
                    .times(Mat4.scale(0.13,0.4,0.13))

            }else{
                this.leftArm_angle+=0.02;
                miner_arm_left_tr  = miner_arm_left_tr
                    .times(Mat4.rotation(this.leftArm_angle,0,0,1))
                    .times(Mat4.scale(0.13,0.4,0.13))
            }

            if(Math.floor(2*t)%2==0){
                this.rightArm_angle+=0.02;
                miner_arm_right_tr  = miner_arm_right_tr
                    .times(Mat4.rotation(this.rightArm_angle,0,0,1))
                    .times(Mat4.scale(0.13,0.4,0.13))
            }else
            {
                this.rightArm_angle-=0.02;
                miner_arm_right_tr  = miner_arm_right_tr
                    .times(Mat4.rotation(this.rightArm_angle,0,0,1))
                    .times(Mat4.scale(0.13,0.4,0.13))
            }
        }
        else{
            miner_arm_left_tr  = miner_arm_left_tr
                .times(Mat4.rotation(this.leftArm_angle,0,0,1))
                .times(Mat4.scale(0.13,0.4,0.13))

            miner_arm_right_tr  = miner_arm_right_tr
                .times(Mat4.rotation(this.rightArm_angle,0,0,1))
                .times(Mat4.scale(0.13,0.4,0.13))
        }



        miner_cloth_tr  = miner_cloth_tr.times(Mat4.translation(this.position,5.12,2.2))
            .times(Mat4.scale(0.3,0.35,0.2))

        miner_leg_left_tr  = miner_leg_left_tr.times(Mat4.translation(-0.22+this.position,4.45,2.2))
        miner_leg_right_tr  = miner_leg_right_tr.times(Mat4.translation(0.22+this.position,4.45,2.2))
            if(!this.isStopped){
                miner_leg_left_tr  = miner_leg_left_tr.times(Mat4.rotation(-Math.PI/13-Math.PI/13*Math.sin(2*Math.PI*t),0,0,1))
                    .times(Mat4.scale(0.15,0.37,0.21))
                miner_leg_right_tr  = miner_leg_right_tr.times(Mat4.rotation(Math.PI/13+Math.PI/13*Math.sin(2*Math.PI*t),0,0,1))
                    .times(Mat4.scale(0.15,0.37,0.21))
                this.isStopped=true;
            }
            else {
                miner_leg_left_tr = miner_leg_left_tr.times(Mat4.rotation(-Math.PI / 20, 0, 0, 1))
                    .times(Mat4.scale(0.15, 0.37, 0.21))
                miner_leg_right_tr  = miner_leg_right_tr
                    .times(Mat4.rotation(Math.PI/20,0,0,1))
                    .times(Mat4.scale(0.15,0.37,0.21))
        }


        miner_beard_tr=miner_beard_tr.times(Mat4.translation(this.position,5.52,2.5))
            .times(Mat4.scale(0.43,0.18,0.05))
            .times(Mat4.rotation(Math.PI/2,1,0,0))

        miner_eye_left_tr=miner_eye_left_tr.times(Mat4.translation(-0.1+this.position,5.8,2.55))
            .times(Mat4.scale(0.05,0.07,0.05))

        miner_eye_right_tr=miner_eye_right_tr.times(Mat4.translation(0.1+this.position,5.8,2.55))
            .times(Mat4.scale(0.05,0.07,0.05))






        //chrac_tr = chrac_tr.times(Mat4.translation(this.position,5.6,0))

        program_state.lights = [new Light(vec4(this.position,20, 0, 1), color(1, 1, 1, 1), 10)];
        if(this.light===true)
        {
            this.time+=0.05;
            program_state.lights.push(new Light(vec4(this.position,-1*(this.time)+5, 0, 1), color(1, 1, 1, 1), 5));
            let flash_tr= Mat4.identity();
            flash_tr=flash_tr.times(Mat4.translation(this.position,-1*(this.time)+5,1)).times(Mat4.scale(0.05,0.8,0.05)).times(Mat4.rotation(Math.PI/2,1,0,0));
            this.shapes.flashbang.draw(context, program_state, flash_tr, this.materials.sun1)
            if(this.time>=30)
            {
                this.light=false;
                this.time=0;
            }
        }
        if (this.light_time<0)
        {
            this.fireflies=false;
            this.light_time+=0.01;
        }
        else if (this.light_time < 9)
        {
            this.fireflies=true;
            this.light_time+=0.01;
        }
        else
        {
            this.fireflies=false;
            this.light_time-=15;
            this.light_x=Math.random()*(8 -(-8))+(-8);
            this.light_y=Math.random()*(0 -(-8))+(-8);
        }
        const omega = (1/10) * Math.PI;
        const whiteness = (1/2) * Math.cos(omega * 5*t) + 1/2;
        let sun_material = this.materials.sun;
        sun_material.color = color(0.5294*whiteness, 0.80*whiteness, 0.92*whiteness, 1);
        let brightness= 1-whiteness
        let sun_transform = Mat4.identity();
        const sun_scale = 0.15;
        sun_transform = sun_transform.times(Mat4.scale(sun_scale, sun_scale, sun_scale));
        sun_transform = sun_transform.times(Mat4.rotation(t, 0, 0, 1))
            .times(Mat4.translation(20, 0, 0));
        sun_transform = Mat4.translation(this.light_x,this.light_y,0).times(sun_transform);
        if(this.fireflies==true)
        {program_state.lights.push (new Light(vec4(this.light_x+3*Math.cos(t), this.light_y+3*Math.sin(t), 0, 1), color(0.5294, 0.80, 0.92, 1), 3*whiteness));
        this.shapes.sun.draw(context, program_state, sun_transform, sun_material);}
        else
        {
            program_state.lights.push (new Light(vec4(this.light_x+3*Math.cos(t), this.light_y+3*Math.sin(t), 0, 1), color(0, 0, 0, 1), 0));
        }



        //this.shapes.miner.draw(context, program_state, chrac_tr, this.materials.miner)
        this.shapes.miner_head.draw(context, program_state, miner_head_tr, this.materials.miner_skin)
        this.shapes.miner_hat.draw(context, program_state, miner_hat_tr, this.materials.miner_hat)
        this.shapes.miner_body.draw(context, program_state, miner_cloth_tr, this.materials.miner_cloth)
        this.shapes.miner_head.draw(context, program_state, miner_arm_left_tr, this.materials.miner_skin)
        this.shapes.miner_head.draw(context, program_state, miner_arm_right_tr, this.materials.miner_skin)
        this.shapes.miner_body.draw(context, program_state, miner_leg_right_tr, this.materials.miner_pants)
        this.shapes.miner_body.draw(context, program_state, miner_leg_left_tr, this.materials.miner_pants)
        this.shapes.miner_hat.draw(context, program_state, miner_beard_tr, this.materials.miner_beard)
        this.shapes.miner_head.draw(context, program_state, miner_eye_left_tr, this.materials.miner_eye)
        this.shapes.miner_head.draw(context, program_state, miner_eye_right_tr, this.materials.miner_eye)



        let stone_tr = Mat4.identity();
        stone_tr = stone_tr.times(Mat4.translation(this.x_list[0],this.y_list[0],-1))
        if (this.collide_x === 4 && this.collide_y === -3)
        {
            stone_tr = this.hookTr;
            stone_tr = stone_tr.times(Mat4.translation(0,-2,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, stone_tr, this.materials.stone)

        let stone2_tr = Mat4.identity();
        stone2_tr = stone2_tr.times(Mat4.translation(this.x_list[4],this.y_list[4],-1))
        if (this.collide_x === -10 && this.collide_y === -2)
        {
            stone2_tr = this.hookTr;
            stone2_tr = stone2_tr.times(Mat4.translation(0,-2,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, stone2_tr, this.materials.stone)

        let stone3_tr = Mat4.identity();
        stone3_tr = stone3_tr.times(Mat4.translation(this.x_list[5],this.y_list[5],-1))
        if (this.collide_x === -6 && this.collide_y === -4)
        {
            stone3_tr = this.hookTr;
            stone3_tr = stone3_tr.times(Mat4.translation(0,-2,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, stone3_tr, this.materials.stone)

        //draw gold
        let gold_tr= Mat4.identity();
        gold_tr= gold_tr.times(Mat4.translation(this.x_list[1],this.y_list[1],-1))
        if (this.collide_x === 1 && this.collide_y === 0)
        {
            gold_tr = this.hookTr;
            gold_tr = gold_tr.times(Mat4.translation(0,-2,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, gold_tr, this.materials.gold)

        let gold2_tr= Mat4.identity();
        gold2_tr= gold2_tr.times(Mat4.translation(this.x_list[2],this.y_list[2],-1))
        if (this.collide_x === 12 && this.collide_y === -3)
        {
            gold2_tr = this.hookTr;
            gold2_tr = gold2_tr.times(Mat4.translation(0,-2,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, gold2_tr, this.materials.gold)

        let gold3_tr= Mat4.identity();
        gold3_tr= gold3_tr.times(Mat4.translation(this.x_list[3],this.y_list[3],-1))
        if (this.collide_x === -3 && this.collide_y === -7)
        {
            gold3_tr = this.hookTr;
            gold3_tr = gold3_tr.times(Mat4.translation(0,-2,0)).times(Mat4.inverse(Mat4.scale(0.4, 0.4, 0.4)));
        }
        this.shapes.planet_1.draw(context, program_state, gold3_tr, this.materials.gold)

        //draw background
        let wallb_tr= Mat4.identity();
        wallb_tr=wallb_tr.times(Mat4.translation(0,9,-5)).times(Mat4.scale(20, 30, 0.1).times(Mat4.rotation(0.01*t, 0, 0, 1)))
        this.shapes.backwall.draw(context, program_state, wallb_tr, this.materials.sky)

        //draw back wall
        let wall_tr= Mat4.identity();
        wall_tr=wall_tr.times(Mat4.translation(0,-7.25,-2)).times(Mat4.scale(20, 11.25, 0.1))
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

        //draw skyscraper
        let skyscraper_tr = Mat4.identity();
        let skyscraper_tr_1 = skyscraper_tr.times(Mat4.translation(-4,5.8,-4)).times(Mat4.scale(1, 1.8, 1))
        let skyscraper_tr_2 = skyscraper_tr.times(Mat4.translation(-9,6,-4)).times(Mat4.scale(1, 2, 1))
        let skyscraper_tr_3 = skyscraper_tr.times(Mat4.translation(4,6,-4)).times(Mat4.scale(1, 2, 1))
        let skyscraper_tr_4 = skyscraper_tr.times(Mat4.translation(7,5.8,-4)).times(Mat4.scale(1, 1.8, 1))
        this.shapes.skyscraper.draw(context, program_state, skyscraper_tr_1, this.materials.skyscraper)
        this.shapes.skyscraper.draw(context, program_state, skyscraper_tr_2, this.materials.skyscraper)
        this.shapes.skyscraper.draw(context, program_state, skyscraper_tr_3, this.materials.skyscraper)
        this.shapes.skyscraper.draw(context, program_state, skyscraper_tr_4, this.materials.skyscraper)

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
                this.hookTr = hook_tr;
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
    }
}

