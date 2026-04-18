using UnityEngine;
using ShadowShift.Core;

namespace ShadowShift.Systems
{
    public class CameraFollow2D : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Transform target;
        [SerializeField] private FollowTargetProvider targetProvider;

        [Header("Follow")]
        [SerializeField] private Vector3 offset = new Vector3(0f, 1f, -10f);
        [SerializeField] private float smoothTime = 0.15f;

        [Header("Axis Control")]
        [SerializeField] private bool followX = true;
        [SerializeField] private bool followY = true;

        private Vector3 currentVelocity;

        private void LateUpdate()
        {
            Transform currentTarget = ResolveTarget();

            if (currentTarget == null)
            {
                return;
            }

            Vector3 desiredPosition = currentTarget.position + offset;
            Vector3 currentPosition = transform.position;

            if (!followX)
            {
                desiredPosition.x = currentPosition.x;
            }

            if (!followY)
            {
                desiredPosition.y = currentPosition.y;
            }

            desiredPosition.z = offset.z;

            transform.position = Vector3.SmoothDamp(
                currentPosition,
                desiredPosition,
                ref currentVelocity,
                smoothTime);
        }

        private Transform ResolveTarget()
        {
            if (target != null)
            {
                return target;
            }

            if (targetProvider != null && targetProvider.FollowTarget != null)
            {
                return targetProvider.FollowTarget;
            }

            return null;
        }
    }
}
