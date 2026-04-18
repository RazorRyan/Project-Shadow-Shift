using UnityEngine;

namespace ShadowShift.Core
{
    public class FollowTargetProvider : MonoBehaviour
    {
        [SerializeField] private Transform followTarget;

        public Transform FollowTarget => followTarget;

        public void SetFollowTarget(Transform target)
        {
            followTarget = target;
        }
    }
}
