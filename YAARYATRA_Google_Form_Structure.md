{
  "role": "system",
  "objective": "Exhaustively test, validate, and permanently fix segment-based passenger pickup & drop matching and direction/time validation logic in the car-pooling backend, ensuring all real-world edge cases are handled correctly and all tests pass without regressions.",
  "strict_execution_rule": "DO NOT STOP until all tests for pickup/drop matching and direction/time validation PASS.",
  "current_verified_state": {
    "road_segment_generation": "WORKING",
    "segment_storage": "WORKING",
    "direction_basic_validation": "WORKING (simple cases)",
    "time_ordering": "WORKING (basic cases)",
    "confidence_scoring": "IN PROGRESS",
    "polyline_fallback": "WORKING"
  },
  "features_under_test": [
    "Segment-Based Passenger Pickup Matching",
    "Segment-Based Passenger Drop Matching",
    "Directional Route Validation",
    "Time-Based Route Validation",
    "Loop & Repeated Road Handling"
  ],
  "problem_scope": {
    "real_world_cases": [
      "Flyover vs service road",
      "Parallel roads with same coordinates",
      "Opposite direction on same road",
      "Circular routes",
      "Same road appearing multiple times",
      "Pickup after drop (invalid)",
      "Pickup on later occurrence of same segment",
      "Drop before pickup in time but after in index",
      "Passenger route partially overlapping driver route"
    ]
  },
  "hard_constraints": {
    "do_not_break_segment_generation": true,
    "do_not_break_confidence_scoring": true,
    "do_not_remove_fallback": true,
    "no_paid_apis": true,
    "backend_only_changes": true
  },
  "mandatory_analysis_tasks": [
    {
      "task": "Trace pickup & drop matching execution path",
      "details": [
        "Locate pickup/drop matching logic",
        "Verify matching uses roadSegments and NOT raw GPS distance",
        "Verify roadId comparison is used",
        "Verify direction is checked per segment",
        "Verify time ordering uses estimatedTime, not index"
      ]
    },
    {
      "task": "Validate direction matching",
      "details": [
        "Reject opposite direction on same roadId",
        "Reject bidirectional mismatch if restricted",
        "Confirm direction is derived from segment geometry"
      ]
    },
    {
      "task": "Validate time-based ordering",
      "details": [
        "pickupTime < dropTime must be enforced",
        "Index ordering must NOT be used as fallback",
        "estimatedTime must be source of truth"
      ]
    },
    {
      "task": "Handle loop & repeated segment cases",
      "details": [
        "Same roadId appearing multiple times",
        "Pickup must match correct occurrence by time",
        "Drop must occur after pickup in time"
      ]
    }
  ],
  "mandatory_test_suite_requirements": {
    "tests_to_create_or_fix": [
      {
        "name": "Pickup on Same Segment - ACCEPT",
        "expected": "Match found"
      },
      {
        "name": "Pickup on Flyover vs Service Road - REJECT",
        "expected": "No match"
      },
      {
        "name": "Opposite Direction on Same Road - REJECT",
        "expected": "No match"
      },
      {
        "name": "Pickup After Drop (Time) - REJECT",
        "expected": "Invalid match"
      },
      {
        "name": "Loop Route - Correct Segment Occurrence",
        "expected": "Match correct later segment"
      },
      {
        "name": "Partial Overlap - LOW CONFIDENCE",
        "expected": "Confidence < threshold"
      }
    ]
  },
  "mandatory_debug_logging": {
    "logging_level": "error",
    "required_logs": [
      "[DEBUG] Evaluating passenger pickup segment",
      "[DEBUG] Evaluating passenger drop segment",
      "[DEBUG] Matched pickup segment index/time",
      "[DEBUG] Matched drop segment index/time",
      "[DEBUG] Direction validation result",
      "[DEBUG] Time validation result",
      "[DEBUG] Match ACCEPTED",
      "[DEBUG] Match REJECTED: <reason>"
    ]
  },
  "fix_requirements": {
    "pickup_matching": {
      "rules": [
        "Pickup must match driver roadSegment.roadId",
        "GPS proximity alone is insufficient",
        "Direction must match",
        "Time must be valid"
      ]
    },
    "drop_matching": {
      "rules": [
        "Drop must match a later road segment",
        "Drop time must be after pickup time",
        "Same roadId can be used only if time is valid"
      ]
    },
    "direction_validation": {
      "rules": [
        "forward vs backward mismatch must reject",
        "bidirectional allowed only when explicitly marked"
      ]
    },
    "time_validation": {
      "rules": [
        "estimatedTime is the source of truth",
        "segmentIndex must not override time ordering"
      ]
    }
  },
  "completion_criteria": {
    "all_pickup_tests_pass": true,
    "all_direction_tests_pass": true,
    "all_time_tests_pass": true,
    "loop_cases_pass": true,
    "no_false_positives": true,
    "no_false_negatives": true
  },
  "verification_steps": {
    "automated": [
      "Run pickup/drop matching tests",
      "Run direction validation tests",
      "Run time ordering tests"
    ],
    "manual": [
      "Create driver route with loop",
      "Test passenger pickup at multiple points",
      "Verify correct acceptance/rejection"
    ]
  },
  "output_expected": {
    "final_status": "ALL TESTS PASS",
    "explanation": "Why each edge case is now handled correctly",
    "proof": "Test results + debug logs",
    "assurance": "No regressions in existing functionality"
  }
}
