;; Investment Contract

(define-fungible-token energy-token)

(define-map projects
  { project-id: uint }
  {
    name: (string-ascii 50),
    target-amount: uint,
    current-amount: uint,
    owner: principal,
    status: (string-ascii 20)
  }
)

(define-map investments
  { project-id: uint, investor: principal }
  { amount: uint }
)

(define-data-var last-project-id uint u0)

(define-constant err-unauthorized (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-funded (err u102))

(define-public (create-project (name (string-ascii 50)) (target-amount uint))
  (let
    ((new-id (+ (var-get last-project-id) u1)))
    (map-set projects
      { project-id: new-id }
      {
        name: name,
        target-amount: target-amount,
        current-amount: u0,
        owner: tx-sender,
        status: "active"
      }
    )
    (var-set last-project-id new-id)
    (ok new-id)
  )
)

(define-public (invest-in-project (project-id uint) (amount uint))
  (let
    ((project (unwrap! (map-get? projects { project-id: project-id }) err-not-found))
     (current-investment (default-to { amount: u0 } (map-get? investments { project-id: project-id, investor: tx-sender }))))
    (asserts! (is-eq (get status project) "active") err-already-funded)
    (try! (stx-transfer? amount tx-sender (get owner project)))
    (map-set investments
      { project-id: project-id, investor: tx-sender }
      { amount: (+ (get amount current-investment) amount) }
    )
    (map-set projects
      { project-id: project-id }
      (merge project {
        current-amount: (+ (get current-amount project) amount)
      })
    )
    (if (>= (+ (get current-amount project) amount) (get target-amount project))
      (map-set projects
        { project-id: project-id }
        (merge project { status: "funded" })
      )
      false
    )
    (try! (ft-mint? energy-token amount tx-sender))
    (ok true)
  )
)

(define-read-only (get-project (project-id uint))
  (map-get? projects { project-id: project-id })
)

(define-read-only (get-investment (project-id uint) (investor principal))
  (map-get? investments { project-id: project-id, investor: investor })
)
