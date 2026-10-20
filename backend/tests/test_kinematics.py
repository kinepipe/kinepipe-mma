import pytest
import numpy as np
from backend.app.core.kinematics_math import (
    calculate_angle_2d,
    calculate_segment_angle,
    butterworth_lowpass_filter,
    compute_central_difference_derivatives,
    analyze_vertical_jump,
    estimate_center_of_mass_2d
)

def test_calculate_angle_right_angle():
    # Right angle: (1, 0) - (0, 0) - (0, 1) -> 90 degrees
    p1 = (1.0, 0.0)
    p_vert = (0.0, 0.0)
    p3 = (0.0, 1.0)
    angle = calculate_angle_2d(p1, p_vert, p3)
    assert abs(angle - 90.0) < 1e-4

def test_calculate_angle_straight_line():
    # Straight line: (-1, 0) - (0, 0) - (1, 0) -> 180 degrees
    p1 = (-1.0, 0.0)
    p_vert = (0.0, 0.0)
    p3 = (1.0, 0.0)
    angle = calculate_angle_2d(p1, p_vert, p3)
    assert abs(angle - 180.0) < 1e-4

def test_butterworth_filter_preserves_mean():
    # A constant signal + high frequency noise should preserve the mean
    t = np.linspace(0, 1, 100)
    clean_signal = np.sin(2 * np.pi * 2 * t)  # 2 Hz
    noisy_signal = clean_signal + 0.2 * np.sin(2 * np.pi * 35 * t)  # 35 Hz noise
    
    filtered = butterworth_lowpass_filter(noisy_signal, cutoff_hz=6.0, fs=100.0, order=4)
    assert len(filtered) == len(noisy_signal)
    # The noise variance should be significantly reduced
    noise_orig = np.var(noisy_signal - clean_signal)
    noise_filt = np.var(filtered - clean_signal)
    assert noise_filt < noise_orig

def test_central_difference_derivative():
    # Linear ramp x(t) = 3*t -> derivative should be 3.0
    dt = 0.02
    t = np.arange(0, 1.0, dt)
    x = 3.0 * t
    v = compute_central_difference_derivatives(x, dt)
    assert np.allclose(v[1:-1], 3.0, atol=1e-3)

def test_analyze_vertical_jump():
    fps = 30.0
    dt = 1.0 / fps
    n = 90
    timestamps = np.arange(n) * dt
    
    # Simulate a CMJ jump trajectory (COM in meters):
    # Quiet standing at 0.9m for 15 frames
    # Dip down to 0.6m at frame 30
    # Takeoff at frame 40 (vy = 2.8 m/s)
    # Flight: apex at frame 55 (1.3m)
    # Landing at frame 70 (0.9m)
    y = np.full(n, 0.9)
    y[15:35] = np.linspace(0.9, 0.6, 20)
    y[35:41] = np.linspace(0.6, 0.95, 6)
    y[40:71] = 0.95 + 0.35 * np.sin(np.linspace(0, np.pi, 31))
    
    vy = np.gradient(y, dt)
    knee_angles = np.full(n, 175.0)
    knee_angles[30] = 95.0  # max flexion at dip
    
    res = analyze_vertical_jump(
        com_y_meters=y,
        com_vy_meters_s=vy,
        knee_angles_deg=knee_angles,
        timestamps_s=timestamps,
        fps=fps,
        jump_type="CMJ"
    )
    
    assert res["flight_time_s"] > 0.0
    assert res["flight_height_cm"] > 0.0
    assert res["takeoff_frame"] > 0
    assert res["apex_frame"] >= res["takeoff_frame"]
    assert res["landing_frame"] >= res["apex_frame"]
