# Below is the original version of the trajectory calculation, taken from: https://pastebin.com/GXUt7BMJ

# Everything here is reverse from the .exe version 5.16.0
# Clean versions of functions are proposed where the assembly was not optimized
# (of course it's ASM translated in C++ then translated in Python)
# by ThiSpawn on 25/12/2016, fuck christmas

from math import exp, log, pi, atan2, sqrt, sin, cos
from copy import copy


def isclose(a, b, rel_tol=1e-09, abs_tol=0.0):
    return abs(a-b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)


class Vector3(object):
    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x = x
        self.y = y
        self.z = z

    def __iadd__(self, other):
        self.x += other.x
        self.y += other.y
        self.z += other.z
        return self

    def __add__(self, other):
        return Vector3(
            self.x + other.x,
            self.y + other.y,
            self.z + other.z)

    def __isub__(self, other):
        self.x -= other.x
        self.y -= other.y
        self.z -= other.z
        return self

    def __sub__(self, other):
        return Vector3(
            self.x - other.x,
            self.y - other.y,
            self.z - other.z)

    def __imul__(self, other):
        if isinstance(other, Vector3):
            self.x *= other.x
            self.y *= other.y
            self.z *= other.z
        else:
            self.x *= other
            self.y *= other
            self.z *= other
        return self

    def __mul__(self, other):
        if isinstance(other, Vector3):
            return Vector3(
                self.x * other.x,
                self.y * other.y,
                self.z * other.z)
        return Vector3(
            self.x * other,
            self.y * other,
            self.z * other)

    def __idiv__(self, other):
        if isinstance(other, Vector3):
            self.x /= other.x
            self.y /= other.y
            self.z /= other.z
        else:
            self.x /= other
            self.y /= other
            self.z /= other
        return self

    def __div__(self, other):
        if isinstance(other, Vector3):
            return Vector3(
                self.x / other.x,
                self.y / other.y,
                self.z / other.z)
        return Vector3(
            self.x / other,
            self.y / other,
            self.z / other)

    def __str__(self):
        return '({:f}, {:f}, {:f})'.format(self.x, self.y, self.z)

    def dot(self, other):
        isinstance(other, Vector3)
        return self.x * other.x + self.y * other.y + self.z * other.z

    def sqnorm(self):
        return self.dot(self)

    def len(self):
        return sqrt(self.sqnorm())

    def normalize(self):
        n = self.len()
        self.x /= n
        self.y /= n
        self.z /= n

    def normalized(self):
        return self / self.len()

    def update(self, other):
        isinstance(other, Vector3)
        self.x = other.x
        self.y = other.y
        self.z = other.z


BALLISTIC_FLATTENING = 1.0
BALLISTIC_SCALE = 60.0


def flatten_traj_height(h):
    if BALLISTIC_FLATTENING != 0.0 and h > 0:
        h = log(BALLISTIC_FLATTENING * h + 1.0) / BALLISTIC_FLATTENING
    return h


def unflatten_traj_height(h):
    if BALLISTIC_FLATTENING != 0.0 and h > 0:
        h = (exp(BALLISTIC_FLATTENING * h) - 1.0) / BALLISTIC_FLATTENING
    return h


def set_ballistic_flattening(f):
    global BALLISTIC_FLATTENING
    BALLISTIC_FLATTENING = f


def set_ballistic_scale(f):
    global BALLISTIC_SCALE
    BALLISTIC_SCALE = f


def d_to_area(d):
    return 0.25 * d * d * pi


def unflatten_pos_and_vel_original(pos, vel_dir):
    assert isinstance(pos, Vector3)
    assert isinstance(vel_dir, Vector3)
    y = unflatten_traj_height(pos.y)

    new_pos = pos + vel_dir * 0.001
    new_pos.y = unflatten_traj_height(new_pos.y)

    pos.y = y

    angle_z2x = atan2(vel_dir.x, vel_dir.z)
    dz = new_pos.z - pos.z
    dx = new_pos.x - pos.x
    pitch_angle = -atan2(new_pos.y - pos.y, sqrt(dz * dz + dx * dx))

    vel_dir.x = sin(angle_z2x) * cos(pitch_angle)
    vel_dir.y = sin(-pitch_angle)
    vel_dir.z = cos(angle_z2x) * cos(pitch_angle)

    return pos, vel_dir


# the calculus seemed dumb, and it was.
def unflatten_pos_and_vel(pos, vel_dir):
    assert isinstance(pos, Vector3)
    assert isinstance(vel_dir, Vector3)

    vel_dir *= 0.001  # small delta to approximate non linear warp of the tangent
    y0 = unflatten_traj_height(pos.y)
    y1 = unflatten_traj_height(pos.y + vel_dir.y)

    pos.y = y0
    vel_dir.y = y1 - y0
    vel_dir.normalize()

    return pos, vel_dir

if 0:
    __a = unflatten_pos_and_vel_original(Vector3(20.0, 3.0, 10.0), Vector3(10.0, 5.0, 5.0))
    __b = unflatten_pos_and_vel(Vector3(20.0, 3.0, 10.0), Vector3(10.0, 5.0, 5.0))
    assert isclose(__a[0].x, __b[0].x)
    assert isclose(__a[0].y, __b[0].y)
    assert isclose(__a[0].z, __b[0].z)
    assert isclose(__a[1].x, __b[1].x)
    assert isclose(__a[1].y, __b[1].y)
    assert isclose(__a[1].z, __b[1].z)


# Lesta values, yes.. G is not as precise as the rest :P
G = 9.8
G_VEC = Vector3(0, -G, 0)
GAS_CST_R = 8.31447  # N.m / (mol.K)
AIR_MOLAR_MASS = 0.0289644  # kg / mol
SEALEVEL_TEMPERATURE = 288.15  # K
STATIC_PRESSURE_LVL0 = 101325.0  # Pa
TEMPERATURE_LAPSE_RATE_LVL0 = -0.0065  # K / m
PRESSURE_CST_H0 = G * AIR_MOLAR_MASS / (GAS_CST_R * TEMPERATURE_LAPSE_RATE_LVL0)


TEMPERATURE_LAPSE_RATE_LVL0_NEG = 0.0065  # K / m
PRESSURE_CST_H0_NEG = -PRESSURE_CST_H0


def altitude_temperature(y):
    return SEALEVEL_TEMPERATURE + y * TEMPERATURE_LAPSE_RATE_LVL0


def altitude_pressure_original(y):
    return STATIC_PRESSURE_LVL0 * pow(
        1 - y * TEMPERATURE_LAPSE_RATE_LVL0_NEG / SEALEVEL_TEMPERATURE,
        PRESSURE_CST_H0_NEG)


def altitude_pressure(y):
    return STATIC_PRESSURE_LVL0 * pow(
        SEALEVEL_TEMPERATURE / altitude_temperature(y),
        PRESSURE_CST_H0)

assert isclose(altitude_pressure_original(260), altitude_pressure(260))


def altitude_pressure_n_temperature(y):
    temperature = altitude_temperature(y)
    return STATIC_PRESSURE_LVL0 * pow(
        SEALEVEL_TEMPERATURE / temperature,
        PRESSURE_CST_H0), temperature


class TrajPoint(object):
    def __init__(self, pos, v, time):
        self.pos = pos
        self.v = v
        self.time = time


class BulletSim(object):
    def __init__(self, mass, d, air_drag_coeff, velocity0, s_pos, s_dir):
        self.mass = mass
        self.d = d
        self.airDragCoeff = air_drag_coeff
        self.v0 = velocity0
        self.pos = s_pos
        self.vel_vec = s_dir.normalized() * velocity0
        self.A = 0.25 * d * d * pi
        self.time = 0.0
        self.steps = 0

    def step_original(self):
        dy = self.pos.y * 0.48749998 * 0.0013333333
        dt = max(min(dy * exp(dy), 0.8125), 0.1001)
        vel_vec = self.vel_vec

        p, temperature = altitude_pressure_n_temperature(self.pos.y)
        air_density = AIR_MOLAR_MASS * p / (GAS_CST_R * temperature)
        drag = self.A * 0.5 * self.airDragCoeff * air_density * vel_vec.sqnorm()

        pitch = atan2(vel_vec.y, sqrt(vel_vec.z * vel_vec.z + vel_vec.x * vel_vec.x))
        yaw = atan2(vel_vec.z, vel_vec.x)

        a_drag = -drag / self.mass
        a_horizontal = cos(pitch) * a_drag
        a_vertical = sin(pitch) * a_drag - G

        a = Vector3(
            cos(yaw) * a_horizontal,
            a_vertical,
            sin(yaw) * a_horizontal)

        self.pos += vel_vec * dt
        self.vel_vec += a * dt
        self.steps += 1

    def step(self):
        dy = self.pos.y * 0.00064999
        dt = max(min(dy * exp(dy), 0.8125), 0.1001)
        vel_vec = self.vel_vec

        p, temperature = altitude_pressure_n_temperature(self.pos.y)
        air_density = AIR_MOLAR_MASS * p / (GAS_CST_R * temperature)
        drag = self.A * 0.5 * self.airDragCoeff * air_density * vel_vec.sqnorm()

        a = (vel_vec.normalized() * (-drag / self.mass) + G_VEC)

        self.pos += vel_vec * dt
        self.vel_vec += a * dt
        self.steps += 1

if 0:
    _bullet0 = BulletSim(3.0, 0.04, 0.35, 300.0, Vector3(20.0, 3.0, 10.0), Vector3(10.0, 5.0, 5.0))
    _bullet0.step_original()
    _bullet1 = BulletSim(3.0, 0.04, 0.35, 300.0, Vector3(20.0, 3.0, 10.0), Vector3(10.0, 5.0, 5.0))
    _bullet1.step()
    assert isclose(_bullet0.vel_vec.x, _bullet1.vel_vec.x)
    assert isclose(_bullet0.vel_vec.y, _bullet1.vel_vec.y)
    assert isclose(_bullet0.vel_vec.z, _bullet1.vel_vec.z)


# flatten_output is not part of Lesta's code, it's added for comparison with real trajectory
# Lesta's bug: if the input shoot_pos is not already flattened, their code doesn't flatten the first trajectory point.
def build_trajectory(mass, d, air_drag_coeff, velocity, shoot_pos, shoot_dir,
                     draft, ret_stride, flat_input, t0, trajectory, flatten_output=False):
    s_pos = copy(shoot_pos)
    s_dir = copy(shoot_dir)

    # added (not original)
    flat_s_pos = copy(shoot_pos)
    if flat_input:
        unflatten_pos_and_vel(s_pos, s_dir)
    else:
        flat_s_pos.y = flatten_traj_height(flat_s_pos.y)

    initial_len = len(trajectory)
    trajectory.append(TrajPoint(flat_s_pos if flatten_output else s_pos, velocity, t0))

    bullet = BulletSim(mass, d, air_drag_coeff, velocity, s_pos * BALLISTIC_SCALE, s_dir)

    if bullet.pos.y >= 0.0:
        cur_i = initial_len
        inv_ballistic_scale = 1.0 / BALLISTIC_SCALE
        while cur_i < 1024:
            cur_i += 1
            bullet.step()
            bullet_world_pos = copy(bullet.pos) * inv_ballistic_scale
            if flatten_output:
                bullet_world_pos.y = flatten_traj_height(bullet_world_pos.y)
            trajectory.append(TrajPoint(
                bullet_world_pos,
                bullet.vel_vec.len(),
                t0 + bullet.time))
            if bullet_world_pos.y <= 0.0:
                break
        else:
            raise OverflowError(
                "Oversize of vs array (1024): Arguments: mass:{:f}, d:{:f}, airDragCoeff:{:f}, v:{:f}, pos:{!s}, "
                "dir:{!s}, draft:{!s}\n".format(mass, d, air_drag_coeff, velocity, shoot_pos, shoot_dir, draft))

    # possible exploit here : assumed underwater with already 2 points and going down..
    p0, p1 = trajectory[-2:]
    pos0, pos1 = p0.pos, p1.pos
    v37 = 1.0 - pos1.y / (pos1.y - pos0.y)
    if v37 >= 0.00000011920929:  # lastlast bullet was overwater
        p1.pos = pos0 + (pos1 - pos0) * v37
        p1.time = p0.time + (p1.time - p0.time) * v37
    elif trajectory:
        trajectory.pop()

    if ret_stride > 1:
        # fixed (official code is wrong: cur_i = 0)
        cur_i = initial_len
        end = len(trajectory)
        if initial_len < end:
            i = initial_len
            while i < end:
                trajectory[cur_i] = trajectory[i]
                i += ret_stride
                cur_i += 1
        # official code is weird:
        # if trajectory[-1].v != trajectory[cur_i - 1].v:
        if cur_i != end:
            trajectory[cur_i] = trajectory[-1]
            del trajectory[cur_i + 1:]
            # new size was wrong if cur_i inited with 0:
            # new_size = initial_len + cur_i;

    return 1

if 1:
    import matplotlib.pyplot as plt
    set_ballistic_scale(60.0)
    for i in range(1, 15):
        traj = []
        build_trajectory(3.0, 0.04, 0.35, 300.0, Vector3(0.0, 0.2, 0.0), Vector3(1.0, 0.1*i, 0), 0, 1, False, 0, traj)
        xs, ys = zip(*((p.pos.x, p.pos.y) for p in traj))
        plt.plot(xs, ys, 'r-')
        flattened_ys = list(flatten_traj_height(y) for y in ys)
        plt.plot(xs, flattened_ys, 'b-')
        plt.xlabel('dist (m/ballistic_scale)')
        plt.ylabel('height (m/ballistic_scale)')
        plt.grid(True)
        plt.axis('equal')
        print "final_velocity : ", traj[-1].v
    plt.show()

WATER_DENSITY = 1000.0


def get_dist_underwater(unknown0, unknown1, d, mass, water_drag):
    # drag_coeff = (d_to_area(d) * a5 * 102.0 * G) / (2.0 * a4)
    drag_coeff = (d_to_area(d) * 0.5 * water_drag * WATER_DENSITY) / mass
    return log(unknown0 * unknown1 * drag_coeff + 1.0) / drag_coeff


def get_velo_underwater(t, velocity0, d, mass, water_drag):
    drag_coeff = (d_to_area(d) * 0.5 * water_drag * WATER_DENSITY) / mass
    return velocity0 * exp(-t * drag_coeff)


def get_time_underwater(unknown0, unknown1, d, mass, water_drag):
    drag_coeff = (d_to_area(d) * 0.5 * water_drag * WATER_DENSITY) / mass
    return (exp(unknown0 * drag_coeff) - 1.0) / (unknown1 * drag_coeff)