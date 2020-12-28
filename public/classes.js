//Five states for managing the game.
const GameState = {
    'WaitingForPlayers': 0,
    'PlayerTurn': 1,
    'OpponentTurn': 2,
    'Won': 3,
    'Lost': 4
}

//States for firing procedure.
const FireState = {
    'SettingAngle': 0,
    'SettingPower': 1,
}

//Main class for managing all game activity.
class GameManager {
    constructor(scene, socket) {

        //Items related to game state.
        this.state = GameState['WaitingForPlayers'];
        this.turnLength = 30;
        this.timeLeft = 30;
        this.currentTank = null;
        this.socket = socket;

        //Input related.
        this.pointer  = scene.input.mousePointer;
        this.key = {
            'A': scene.input.keyboard.addKey('A'),
            'D': scene.input.keyboard.addKey('D'),
            'Z': scene.input.keyboard.addKey('Z'),
            'X': scene.input.keyboard.addKey('X'),
            'C': scene.input.keyboard.addKey('C'),
            'W': scene.input.keyboard.addKey('W'),
            'S': scene.input.keyboard.addKey('S')
        };
        this.keyPress = {
            'W': false
        };

        //Related to firing procedure.
        this.fireState = FireState['SettingAngle'];
        this.fireAngle = 0;
        this.firePower = 0;

        //Text initialization and storage.
        this.angleText = scene.add.text(10,10, "Angle: ",{fontSize: '24px', fill:'#000'});
        this.powerText = scene.add.text(10,34, "Power: ",{fontSize: '24px', fill:'#000'});
        this.shellText = scene.add.text(10,58, "Shell: Light",{fontSize: '24px', fill:'#000'});
        this.endText   = scene.add.text(500,300, "",{fontSize: '48px', fill:'#000'});

        this.opponentHealthText = scene.add.text(950, 10, "Opponent Health: ", {fontSize: '24px', fill:'#000'});
        this.playerHealthText   = scene.add.text(950, 34, "Your health: ", {fontSize: '24px', fill:'#000'});
    }

    //Sets the end of game display text to show that the player has won.
    setWinningText() {
        this.endText.setText("You Win! :)");
    }

    //Sets the end of game display text to show that the player has lost.
    setLosingText() {
        this.endText.setText("You Lose! :(");
    }

    //Tells GameManager to check the tank's health.
    //Does not need to be broadcast to other client.
    notifyTankChange(tank) {
        let id = tank.getId();

        if(id == 'player') {
            this.playerHealthText.setText("Your Health: " + tank.getHealth());

            //If your tank's health has dropped to 0 then you've lost.
            if (tank.getHealth() <= 0) {
                this.state = GameState['Lost'];
            }
        }

        if(id == 'opponent') {
            this.opponentHealthText.setText("Opponent Health: " + tank.getHealth());

            //If your opponent's tank's health has dropped to 0 then you've won!
            if (tank.getHealth() <= 0) {
                this.state = GameState['Won'];
            }
        }
    }

    //All keyboard and mouse input is handled here.
    handleInput() {
        /*Controls for moving the tank.*/
        if(this.key['A'].isDown) {
            this.currentTank.moveLeft();
            this.socket.emit('sendTankMove', 'left');
        } else if(this.key['D'].isDown) {
            this.currentTank.moveRight();
            this.socket.emit('sendTankMove', 'right');
        } else {
            this.currentTank.moveStop();
            this.socket.emit('sendTankMove', 'stop');
        }

        /*Controls for switching shells.*/
        if(this.key['Z'].isDown) {
            this.shellText.setText("Shell: Light");
            this.currentTank.selectTankShell('light');
            this.socket.emit('shellSwitch', 'light');
        } else if(this.key['X'].isDown) {
            this.shellText.setText("Shell: Heavy")
            this.currentTank.selectTankShell('heavy');
            this.socket.emit('shellSwitch', 'heavy');
        } else if(this.key['C'].isDown) {
            this.shellText.setText("Shell: Explosive");
            this.currentTank.selectTankShell('explosive');
            this.socket.emit('shellSwitch', 'explosive');
        }


        /***** Controls for firing start here. *****/

        //Make sure W key has come up before checking if the key is down again.
        if(this.key['W'].isUp) {
            this.keyPress['W'] = false;
        }

        //Selecting angle.
        if(this.fireState == FireState['SettingAngle']){
            if(this.key['W'].isDown && this.keyPress['W'] == false){
                this.fireState = FireState['SettingPower'];
                this.keyPress['W'] = true;
            }

            //Get angle based on mouse pointer position.
            let x = this.pointer.x - this.currentTank.getX();
            let y = (720 - this.pointer.y) - (720 - this.currentTank.getY());

            //Prevent a divide by 0 error then calculate the angle.
            if(x != 0) {
                this.fireAngle = Math.atan(y/x)*180/(Math.PI)
            
                if(this.fireAngle < 0) {
                    this.fireAngle = (-1)*this.fireAngle + 90;
                }

                if(this.fireAngle > 100) {
                    this.angleText.setText("Angle: " + this.fireAngle.toPrecision(3));
                } else {
                    this.angleText.setText("Angle: " + this.fireAngle.toPrecision(2));
                }
            }
        }

        //Setting power and firing.
        if(this.fireState == FireState['SettingPower']) {

            //If 'S' is pressed go back to selecting angle.
            if(this.key['S'].isDown) {
                this.fireState = FireState['SettingAngle'];
            }

            //When 'W' is pressed fire and go back to SettingAngle.
            if(this.key['W'].isDown && this.keyPress['W'] == false) {
                this.fireState = FireState['SettingAngle'];
                this.keyPress['W'] = true;
                this.currentTank.fire(this.fireAngle, this.firePower);
                this.socket.emit('fireTankShell', this.fireAngle, this.firePower);
                this.state = GameState['OpponentTurn'];
            }

            //Only allow power between 0 and 800.
            if(this.pointer.x > 0 && this.pointer.x < 800) {
                this.firePower = this.pointer.x;
                this.powerText.setText("Power: " + this.firePower.toPrecision(3));
            }
        }
    }

    /***** Controls for firing end here. *****/


    //Handles all broadcasted input.
    //Similar to handleInput but does not receive commands from keyboard and mouse.
    handleBroadcast(command, move) {
        if(command == 'sendTankMove' && this.currentTank != null) {
            if(move == 'left') {
                this.currentTank.moveRight();
            } else if(move == 'right') {
                this.currentTank.moveLeft();
            } else {
                this.currentTank.moveStop();
            }
        }
    }

    //Handles all broadcasted input for shell firing.
    //Similar to handleInput but does not receive commands from keyboard and mouse.
    handleFireBroadcast(command, angle, power) {
    	if (command == 'fireTankShell' && this.currentTank != null) {
    		this.currentTank.fire(180 - angle, power);
    	}
    }

    handleShellChangeBroadcast(shell) {
        if(this.currentTank != null) {
            this.currentTank.selectTankShell(shell);
        }
    }

    //Sets what tank is currently active.
    setCurrentTank(tank) {
        this.currentTank = tank;
    }

    getState() {
        return this.state;
    }

    setState(state) {
        this.state = GameState[state];
    }
}

//Instantiating class adds a tank to the game for the player.
class Tank {
    constructor(scene, id, image, x, y) {
        this.scene = scene;
        this.id = id;
        this.image = image;
        this.shell = new NormalShell(scene);
        this.update = true;

        this.ref = scene.physics.add.image(x,y,image);
        this.scene.tanks.add(this.ref);

        //Need this to be able to run collisions with TankShells.
        //This attaches a reference to this object to the physics object.
        //Not a great solution but currently don't have an alternative.
        this.ref.myref = this;
    }

    fire(angle, power) {
        this.shell.fire(this.ref.x, this.ref.y, angle, power);
    }

    moveRight() {
        this.ref.setVelocityX(this.speed);
    }

    moveLeft() {
        this.ref.setVelocityX(-this.speed);
    }

    moveStop(){
        this.ref.setVelocityX(0);
    }

    getX() {
        return this.ref.x;
    }

    getY() {
        return this.ref.y;
    }

    getId() {
        return this.id;
    }

    getHealth() {
        return this.health;
    }

    damage(damage) {
        this.health -= damage - this.armor;
        this.setUpdate();
    }

    //Select the desired shell type and instantiate next shell.
    selectTankShell(shellName) {
        if(shellName == 'light') {
            this.shell = new NormalShell(this.scene);
        } else if(shellName == 'heavy') {
            this.shell = new HeavyShell(this.scene);
        } else if(shellName == 'explosive') {
            this.shell = new ExplosiveShell(this.scene);
        }
    }

    setUpdate() {
        this.update = true;
    }

    checkUpdate() {
        let temp = this.update;
        this.update = false;
        return temp;
    }
}

//Instantiating class does not add shell object to the game.
//The shell is added when the fire method is called.
class TankShell {
    constructor(scene) {
        this.scene = scene;
    }

    fire(x, y, angle, power) {
        //Add shell to game.
        let shell = this.scene.physics.add.image(x,y-30,this.image);
        this.scene.shells.add(shell);

        //Need this for c
        shell.myref = this;

        //Set physics properties before firing.
        shell.setCollideWorldBounds(true);
        shell.setBounce(0.5);
        shell.setGravityY(this.weight);

        //Convert angle to radians and grab velocities.
        angle = angle*(Math.PI/180);
        let xVel  = Math.cos(angle)*power;
        let yVel  = (-1)*Math.sin(angle)*power;

        //Fire shell.
        shell.setVelocityX(xVel);
        shell.setVelocityY(yVel);
    }

    getDamage() {
        return this.damage;
    }
}

class LightTank extends Tank {
    constructor(scene, id, image, x, y) {
        super(scene, id, image, x, y);
        this.health = 100;
        this.armor  = 5;
        this.speed  = 100;
        this.weight = 300;
        this.ref.setGravityY(this.weight);
        this.ref.setCollideWorldBounds(true);
    }
}

class HeavyTank extends Tank {
    constructor(scene, id, image, x, y) {
        super(scene, id, image, x, y);
        this.health = 100;
        this.armor  = 10;
        this.speed  = 50;
        this.weight = 400;
        this.ref.setGravityY(this.weight);
        this.ref.setCollideWorldBounds(true);
    }
}

class NormalShell extends TankShell{
    constructor(scene) {
        super(scene);
        this.weight = 300;
        this.image  = 'red-shell';
        this.damage = 25;
        this.bounce = 0.2;
    }
}

class HeavyShell extends TankShell{
    constructor(scene) {
        super(scene);
        this.weight = 600;
        this.image  = 'green-shell';
        this.damage = 50;
        this.bounce = 0.2;
    }
}

class ExplosiveShell extends TankShell{
    constructor(scene) {
        super(scene);
        this.weight = 300;
        this.image  = 'blue-shell';
        this.damage = 10;
        this.bounce = 0.8;
    }

    //Overrides normal fire function to fire three shells.
    fire(x, y, angle, power) {
        let shells = [
            this.scene.physics.add.image(x   ,y-25,this.image).setScale(0.7),
            this.scene.physics.add.image(x-20,y-30,this.image).setScale(0.7),
            this.scene.physics.add.image(x+20,y-30,this.image).setScale(0.7)
        ];

        //Convert angle to radians and grab velocities.
        angle = angle*(Math.PI/180);
        let xVel  = Math.cos(angle)*power;
        let yVel  = (-1)*Math.sin(angle)*power;

        for(let i = 0; i < 3; i++) {
            //Add shell to game.
            shells[i].myref = this;
            this.scene.shells.add(shells[i]);

            //Set physics properties before firing.
            shells[i].setCollideWorldBounds(true);
            shells[i].setBounce(this.bounce);
            shells[i].setGravityY(this.weight);

            //Fire shell.
            shells[i].setVelocityX(xVel);
            shells[i].setVelocityY(yVel);
        }
    }
}