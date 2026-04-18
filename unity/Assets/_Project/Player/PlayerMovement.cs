using UnityEngine;
using ShadowShift.Core;

namespace ShadowShift.Player
{
    [RequireComponent(typeof(Rigidbody2D))]
    public class PlayerMovement : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Transform visualsRoot;
        [SerializeField] private Transform groundCheckPoint;

        [Header("Movement")]
        [SerializeField] private float maxRunSpeed = 8f;
        [SerializeField] private float groundAcceleration = 60f;
        [SerializeField] private float groundDeceleration = 75f;
        [SerializeField] private float airAccelerationMultiplier = 0.65f;

        [Header("Ground Check")]
        [SerializeField] private Vector2 groundCheckSize = new Vector2(0.6f, 0.15f);
        [SerializeField] private LayerMask groundLayers;

        [Header("Jump")]
        [SerializeField] private float jumpForce = 13f;
        [SerializeField] private float coyoteTime = 0.12f;
        [SerializeField] private float jumpBufferTime = 0.12f;

        [Header("Dash")]
        [SerializeField] private bool dashUnlockedByDefault = true;
        [SerializeField] private float dashSpeed = 16f;
        [SerializeField] private float dashDuration = 0.14f;
        [SerializeField] private float dashCooldown = 0.35f;

        [Header("Wall Movement")]
        [SerializeField] private bool wallJumpUnlockedByDefault = true;
        [SerializeField] private Vector2 wallCheckOffset = new Vector2(0.45f, 0f);
        [SerializeField] private Vector2 wallCheckSize = new Vector2(0.2f, 0.9f);
        [SerializeField] private LayerMask wallLayers;
        [SerializeField] private float wallSlideSpeed = 2f;
        [SerializeField] private Vector2 wallJumpForce = new Vector2(8f, 13f);
        [SerializeField] private float wallJumpLockTime = 0.15f;

        private Rigidbody2D body;
        private float moveInput;
        private bool isFacingRight = true;
        private float coyoteTimeCounter;
        private float jumpBufferCounter;
        private bool wasGroundedLastFrame;
        private float dashTimeRemaining;
        private float dashCooldownRemaining;
        private bool dashPressed;
        private bool isDashing;
        private int dashDirection = 1;
        private float defaultGravityScale;
        private bool isTouchingWall;
        private bool isWallSliding;
        private float wallJumpLockCounter;
        private int wallDirection = 1;

        public float MoveInput => moveInput;
        public bool IsGrounded { get; private set; }
        public bool IsFacingRight => isFacingRight;
        public bool IsDashing => isDashing;
        public bool IsWallSliding => isWallSliding;
        private Vector2 CurrentWallCheckPosition => (Vector2)transform.position + new Vector2(wallCheckOffset.x * (isFacingRight ? 1f : -1f), wallCheckOffset.y);

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            defaultGravityScale = body.gravityScale;
        }

        private void Update()
        {
            moveInput = Input.GetAxisRaw("Horizontal");
            UpdateGroundedState();
            UpdateWallState();
            UpdateDashTimers();
            ReadDashInput();
            UpdateJumpTimers();
            HandleDash();
            HandleJumpInput();
            UpdateFacing();
        }

        private void FixedUpdate()
        {
            if (isDashing)
            {
                body.velocity = new Vector2(dashDirection * dashSpeed, 0f);
                return;
            }

            if (wallJumpLockCounter > 0f)
            {
                wallJumpLockCounter -= Time.fixedDeltaTime;
            }

            float targetSpeed = moveInput * maxRunSpeed;

            if (wallJumpLockCounter > 0f)
            {
                targetSpeed = 0f;
            }

            float acceleration = GetAcceleration(targetSpeed);
            float newVelocityX = Mathf.MoveTowards(body.velocity.x, targetSpeed, acceleration * Time.fixedDeltaTime);
            float newVelocityY = body.velocity.y;

            if (ShouldWallSlide() && newVelocityY < -wallSlideSpeed)
            {
                newVelocityY = -wallSlideSpeed;
            }

            body.velocity = new Vector2(newVelocityX, newVelocityY);
        }

        private void UpdateDashTimers()
        {
            if (dashCooldownRemaining > 0f)
            {
                dashCooldownRemaining -= Time.deltaTime;
            }

            if (!isDashing)
            {
                return;
            }

            dashTimeRemaining -= Time.deltaTime;

            if (dashTimeRemaining <= 0f)
            {
                EndDash();
            }
        }

        private void ReadDashInput()
        {
            if (Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift))
            {
                dashPressed = true;
            }
        }

        private void HandleDash()
        {
            if (!dashPressed)
            {
                return;
            }

            dashPressed = false;

            if (!CanDash())
            {
                return;
            }

            StartDash();
        }

        private void UpdateJumpTimers()
        {
            if (isDashing)
            {
                return;
            }

            if (IsGrounded)
            {
                coyoteTimeCounter = coyoteTime;
            }
            else
            {
                coyoteTimeCounter -= Time.deltaTime;
            }

            if (Input.GetButtonDown("Jump"))
            {
                jumpBufferCounter = jumpBufferTime;
            }
            else
            {
                jumpBufferCounter -= Time.deltaTime;
            }
        }

        private void HandleJumpInput()
        {
            if (isDashing)
            {
                return;
            }

            if (jumpBufferCounter > 0f && CanWallJump())
            {
                PerformWallJump();
                return;
            }

            if (jumpBufferCounter > 0f && coyoteTimeCounter > 0f)
            {
                Jump();
            }
        }

        private void Jump()
        {
            jumpBufferCounter = 0f;
            coyoteTimeCounter = 0f;

            body.velocity = new Vector2(body.velocity.x, jumpForce);
            IsGrounded = false;
        }

        private bool CanDash()
        {
            if (isDashing || dashCooldownRemaining > 0f)
            {
                return false;
            }

            if (dashUnlockedByDefault)
            {
                return true;
            }

            return GameContext.Instance != null && GameContext.Instance.HasAbility(AbilityType.Dash);
        }

        private bool CanWallJump()
        {
            if (!ShouldWallSlide())
            {
                return false;
            }

            if (wallJumpUnlockedByDefault)
            {
                return true;
            }

            return GameContext.Instance != null && GameContext.Instance.HasAbility(AbilityType.WallJump);
        }

        private void StartDash()
        {
            isDashing = true;
            dashTimeRemaining = dashDuration;
            dashCooldownRemaining = dashCooldown;
            dashDirection = ResolveDashDirection();
            body.gravityScale = 0f;
            body.velocity = new Vector2(dashDirection * dashSpeed, 0f);
        }

        private int ResolveDashDirection()
        {
            if (moveInput > 0.01f)
            {
                return 1;
            }

            if (moveInput < -0.01f)
            {
                return -1;
            }

            return isFacingRight ? 1 : -1;
        }

        private void EndDash()
        {
            isDashing = false;
            body.gravityScale = defaultGravityScale;
        }

        private void PerformWallJump()
        {
            jumpBufferCounter = 0f;
            coyoteTimeCounter = 0f;
            wallJumpLockCounter = wallJumpLockTime;

            int jumpDirection = -wallDirection;
            body.velocity = new Vector2(jumpDirection * wallJumpForce.x, wallJumpForce.y);

            IsGrounded = false;
            isWallSliding = false;

            if (jumpDirection > 0)
            {
                SetFacing(true);
            }
            else if (jumpDirection < 0)
            {
                SetFacing(false);
            }
        }

        private float GetAcceleration(float targetSpeed)
        {
            if (Mathf.Approximately(targetSpeed, 0f))
            {
                return groundDeceleration;
            }

            float acceleration = groundAcceleration;

            if (!IsGrounded)
            {
                acceleration *= airAccelerationMultiplier;
            }

            return acceleration;
        }

        private void UpdateFacing()
        {
            if (isDashing)
            {
                return;
            }

            if (moveInput > 0.01f)
            {
                SetFacing(true);
            }
            else if (moveInput < -0.01f)
            {
                SetFacing(false);
            }
        }

        private void SetFacing(bool facingRight)
        {
            if (isFacingRight == facingRight)
            {
                return;
            }

            isFacingRight = facingRight;

            if (visualsRoot == null)
            {
                return;
            }

            Vector3 scale = visualsRoot.localScale;
            scale.x = Mathf.Abs(scale.x) * (isFacingRight ? 1f : -1f);
            visualsRoot.localScale = scale;
        }

        public int FacingDirectionSign()
        {
            return isFacingRight ? 1 : -1;
        }

        private void UpdateGroundedState()
        {
            wasGroundedLastFrame = IsGrounded;

            if (groundCheckPoint == null)
            {
                IsGrounded = false;
                return;
            }

            IsGrounded = Physics2D.OverlapBox(groundCheckPoint.position, groundCheckSize, 0f, groundLayers);

            if (!wasGroundedLastFrame && IsGrounded)
            {
                jumpBufferCounter = Mathf.Max(jumpBufferCounter, 0f);
            }
        }

        private void UpdateWallState()
        {
            isTouchingWall = Physics2D.OverlapBox(CurrentWallCheckPosition, wallCheckSize, 0f, wallLayers);

            if (isTouchingWall)
            {
                wallDirection = isFacingRight ? 1 : -1;
            }

            isWallSliding = ShouldWallSlide();
        }

        private bool ShouldWallSlide()
        {
            if (isDashing || IsGrounded || !isTouchingWall)
            {
                return false;
            }

            if (body == null)
            {
                return false;
            }

            return body.velocity.y < 0f;
        }

        private void OnDrawGizmosSelected()
        {
            if (groundCheckPoint != null)
            {
                Gizmos.color = Color.cyan;
                Gizmos.DrawWireCube(groundCheckPoint.position, groundCheckSize);
            }

            Gizmos.color = Color.magenta;
            Gizmos.DrawWireCube(CurrentWallCheckPosition, wallCheckSize);
        }
    }
}
