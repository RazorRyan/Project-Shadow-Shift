using UnityEngine;

namespace ShadowShift.Enemies
{
    [RequireComponent(typeof(Rigidbody2D))]
    public class EnemyPatrol : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 2f;
        [SerializeField] private Transform visualsRoot;

        [Header("Patrol")]
        [SerializeField] private Transform leftPoint;
        [SerializeField] private Transform rightPoint;
        [SerializeField] private float pointReachDistance = 0.1f;

        private Rigidbody2D body;
        private Transform currentTarget;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
        }

        private void Start()
        {
            currentTarget = rightPoint != null ? rightPoint : transform;
            UpdateFacing();
        }

        private void FixedUpdate()
        {
            if (leftPoint == null || rightPoint == null)
            {
                body.velocity = new Vector2(0f, body.velocity.y);
                return;
            }

            MoveTowardsTarget();
            CheckIfReachedTarget();
        }

        private void MoveTowardsTarget()
        {
            float direction = Mathf.Sign(currentTarget.position.x - transform.position.x);

            if (Mathf.Approximately(direction, 0f))
            {
                direction = 1f;
            }

            body.velocity = new Vector2(direction * moveSpeed, body.velocity.y);

            if (visualsRoot != null)
            {
                Vector3 scale = visualsRoot.localScale;
                scale.x = Mathf.Abs(scale.x) * direction;
                visualsRoot.localScale = scale;
            }
        }

        private void CheckIfReachedTarget()
        {
            float distance = Mathf.Abs(currentTarget.position.x - transform.position.x);

            if (distance > pointReachDistance)
            {
                return;
            }

            currentTarget = currentTarget == rightPoint ? leftPoint : rightPoint;
            UpdateFacing();
        }

        private void UpdateFacing()
        {
            if (visualsRoot == null || currentTarget == null)
            {
                return;
            }

            float direction = Mathf.Sign(currentTarget.position.x - transform.position.x);

            if (Mathf.Approximately(direction, 0f))
            {
                direction = 1f;
            }

            Vector3 scale = visualsRoot.localScale;
            scale.x = Mathf.Abs(scale.x) * direction;
            visualsRoot.localScale = scale;
        }

        private void OnDrawGizmosSelected()
        {
            if (leftPoint == null || rightPoint == null)
            {
                return;
            }

            Gizmos.color = Color.yellow;
            Gizmos.DrawLine(leftPoint.position, rightPoint.position);
            Gizmos.DrawWireSphere(leftPoint.position, 0.1f);
            Gizmos.DrawWireSphere(rightPoint.position, 0.1f);
        }
    }
}
