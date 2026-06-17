import { useMemo, type ReactNode } from "react"
import { type StyleProp, type ViewStyle } from "react-native"
import { Callout } from "../ui/callout"

interface Props {
    /** Custom style for the container view. */
    style?: StyleProp<ViewStyle>
    /** The content to display inside the container. */
    children: ReactNode
}

/** @deprecated Use `Callout` with `variant="info"` instead. */
const InfoContainer = ({ style, children }: Props) => {
    const body = useMemo(() => children, [children])
    return (
        <Callout variant="info" style={style}>
            {body}
        </Callout>
    )
}

export default InfoContainer
